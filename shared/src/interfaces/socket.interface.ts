import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    userId: string;
    email: string;
    username: string;
    displayName: string;
  };
}

export type SocketWithUser = AuthenticatedSocket;
