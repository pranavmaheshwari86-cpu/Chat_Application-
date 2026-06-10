import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing or generate new
    const correlationId =
      (req.headers['x-correlation-id'] as string) || randomUUID();

    // Attach to request object

    (req as any).correlationId = correlationId;

    // Attach to response headers
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
