import type { Request } from 'express';
import type { AuthUser } from './jwt-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
