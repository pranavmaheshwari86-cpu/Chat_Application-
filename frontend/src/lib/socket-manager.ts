 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace('/api', '');

interface SocketManagerOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessageNew?: (payload: any) => void;
  onMessageEdited?: (payload: any) => void;
  onMessageDeleted?: (payload: any) => void;
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
        this.socket.emit('presence:ping');
      }
    }, 30000); // 30s heartbeat
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
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
