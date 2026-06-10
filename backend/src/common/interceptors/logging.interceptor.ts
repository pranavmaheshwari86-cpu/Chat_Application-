import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLogger } from '../logger/structured-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();

    const request = ctx.getRequest();

    const response = ctx.getResponse();

    if (!request || !request.method || !request.url) {
      return next.handle(); // e.g. for WS context
    }

    const { method, url, correlationId } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;

        const statusCode = response.statusCode;
        this.logger.log(
          `[HTTP] ${method} ${url} ${statusCode} - ${duration}ms`,
          {
            correlationId,
            duration,

            method,

            url,

            statusCode,

            userId: request.user?.userId || null,
          },
        );
      }),
    );
  }
}
