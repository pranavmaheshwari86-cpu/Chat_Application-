export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  displayName?: string;
}

export interface AuthUser {
  userId: string;
  _id: string;
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status?: string;
}
