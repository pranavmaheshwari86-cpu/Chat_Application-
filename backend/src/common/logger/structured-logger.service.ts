import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class StructuredLogger extends ConsoleLogger {
  private isProduction = process.env.NODE_ENV === 'production';

  log(message: any, ...optionalParams: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.printLog('log', message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.printLog('error', message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.printLog('warn', message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.printLog('debug', message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.printLog('verbose', message, ...optionalParams);
  }

  private printLog(level: string, message: any, ...optionalParams: any[]) {
    const context =
      this.context ||
      optionalParams[optionalParams.length - 1] ||
      'Application';
    const correlationId = this.getCorrelationId(optionalParams);
    const duration = this.getDuration(optionalParams);

    if (this.isProduction) {
      // JSON structured logging
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,

        context,

        message,
        correlationId,
        durationMs: duration,
        ...this.extractAdditionalMetadata(optionalParams),
      };
      console.log(JSON.stringify(logEntry));
    } else {
      // Human readable fallback for dev
      const prefix = correlationId ? `[${correlationId}] ` : '';
      const suffix = duration !== undefined ? ` +${duration}ms` : '';
      super[level as 'log' | 'error' | 'warn' | 'debug' | 'verbose'](
        `${prefix}${message}${suffix}`,
        context,
      );
    }
  }

  private getCorrelationId(optionalParams: any[]): string | undefined {
    // We expect the first optional param to potentially contain correlationId if it's an object
    if (
      optionalParams.length > 0 &&
      typeof optionalParams[0] === 'object' &&
      optionalParams[0] !== null
    ) {
      return optionalParams[0].correlationId;
    }
    return undefined;
  }

  private getDuration(optionalParams: any[]): number | undefined {
    if (
      optionalParams.length > 0 &&
      typeof optionalParams[0] === 'object' &&
      optionalParams[0] !== null
    ) {
      return optionalParams[0].duration;
    }
    return undefined;
  }

  private extractAdditionalMetadata(
    optionalParams: any[],
  ): Record<string, any> {
    if (
      optionalParams.length > 0 &&
      typeof optionalParams[0] === 'object' &&
      optionalParams[0] !== null
    ) {
      const { correlationId, duration, ...rest } = optionalParams[0];

      return rest;
    }
    return {};
  }
}
