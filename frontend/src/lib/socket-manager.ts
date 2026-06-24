 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client';

// Derive socket URL from API URL robustly
function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://server-production-373b.up.railway.app/api';
  try {
    const url = new URL(apiUrl);
    // Use origin (protocol + host + port) for socket connection
    // Validate it's a proper URL with protocol and host
    if (!url.protocol || !url.host) {
      throw new Error('Invalid URL');
    }
    return url.origin;
  } catch {
    // Fallback: remove /api suffix if present, then validate
    const fallback = apiUrl.replace(/\/api\/?$/, '');
    try {
      const url = new URL(fallback);
      if (url.protocol && url.host) {
        return url.origin;
      }
    } catch {
      // Ignore
    }
    // Final fallback
    return 'https://server-production-373b.up.railway.app';
  }
}

const SOCKET_URL = getSocketUrl();

interface SocketManagerOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessageNew?: (payload: any) => void;
  onMessageEdited?: (payload: any) => void;
  onMessageDeleted?: (payload: any) => void;
  onTypingActive?: (payload: any) => void;
  onTypingStopped?: (payload: any) => void;
  onMessageSeen?: (payload: any) => void;
  onMessageDelivered?: (payload: any) => void;
  onMessageReacted?: (payload: any) => void;
}

export class SocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempt: number = 0;
  private options: SocketManagerOptions = {};
  
  // Reconnection backoff: 1s, 2s, 4s, 8s, 16s, 30s max
  private readonly backoffSteps = [1000, 2000, 4000, 8000, 16000, 30000];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pongTimeoutTimer: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30s
  private readonly PONG_TIMEOUT = 10000; // 10s

  public connect(token: string, options: SocketManagerOptions) {
    if (this.socket?.connected || this.isConnecting) return;
    
    this.token = token;
    this.options = options;
    this.isConnecting = true;
    this.reconnectAttempt = 0;

    this.initializeSocket();
  }

  private initializeSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token: this.token },
      transports: ['websocket'],
      reconnection: false, // We handle it manually for exponential backoff + jitter
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      this.options.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      this.stopHeartbeat();
      this.options.onDisconnect?.();
      
      // Auto-reconnect if it was a network drop or server crash, not an explicit client disconnect
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', () => {
      this.isConnecting = false;
      this.scheduleReconnect();
    });

    // Event routing
    this.socket.on('message:new', (payload) => this.options.onMessageNew?.(payload));
    this.socket.on('message:edited', (payload) => this.options.onMessageEdited?.(payload));
    this.socket.on('message:deleted', (payload) => this.options.onMessageDeleted?.(payload));
    this.socket.on('typing:active', (payload) => this.options.onTypingActive?.(payload));
    this.socket.on('typing:stopped', (payload) => this.options.onTypingStopped?.(payload));
    this.socket.on('message:seen', (payload) => this.options.onMessageSeen?.(payload));
    this.socket.on('message:delivered', (payload) => this.options.onMessageDelivered?.(payload));
    this.socket.on('message:reacted', (payload) => this.options.onMessageReacted?.(payload));

    // Heartbeat: handle server ping -> respond with pong
    this.socket.on('ping', () => {
      this.socket?.emit('pong');
    });

    // Heartbeat: handle pong response -> clear timeout
    this.socket.on('pong', () => {
      if (this.pongTimeoutTimer) {
        clearTimeout(this.pongTimeoutTimer);
        this.pongTimeoutTimer = null;
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Exponential backoff
    const baseDelay = this.backoffSteps[Math.min(this.reconnectAttempt, this.backoffSteps.length - 1)] || 1000;
    
    // Jitter: +/- 20% to prevent reconnect storms
    const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
    const delay = baseDelay + jitter;

    this.reconnectAttempt++;
    this.isConnecting = true;

    this.reconnectTimer = setTimeout(() => {
      console.log(`Socket reconnect attempt ${this.reconnectAttempt}...`);
      this.initializeSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.sendPingWithTimeout();
      }
    }, this.PING_INTERVAL);
  }

  private sendPingWithTimeout() {
    if (!this.socket?.connected) return;

    // Send ping
    this.socket.emit('ping');

    // Set timeout for pong response
    this.pongTimeoutTimer = setTimeout(() => {
      console.warn('Pong timeout - connection may be dead, forcing reconnect');
      this.socket?.disconnect(); // Will trigger reconnect logic
    }, this.PONG_TIMEOUT);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.token = null;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
