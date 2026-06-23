import type { AuthenticatedSocket } from '@chat/shared';

interface AuthResult {
  success: true;
  user: {
    userId: string;
    email: string;
    username: string;
    displayName: string;
  };
}

export async function authenticateSocket(
  socket: AuthenticatedSocket,
  verifyToken: (token: string) => Promise<{
    sub: string;
    email: string;
    username: string;
    displayName: string;
  }>,
): Promise<AuthResult | Error> {
  let token = '';
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (socket.handshake.auth?.token) {
    token = socket.handshake.auth.token;
  }

  if (!token) {
    return new Error('Authentication error');
  }

  try {
    const payload = await verifyToken(token);
    socket.user = {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      displayName: payload.displayName,
    };
    return { success: true, user: socket.user };
  } catch {
    return new Error('Authentication error');
  }
}
