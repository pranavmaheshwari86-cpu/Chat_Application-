export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  displayName?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status?: string;
  role?: string;
}
