import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(requestProps: any): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } =
      requestProps;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const client = context.switchToWs().getClient();

    const ip =
      client.handshake?.address || client.conn?.remoteAddress || 'unknown';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const key = generateKey(context, ip, throttler.name);

    const { totalHits } = await this.storageService.increment(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      key,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ttl,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      limit,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blockDuration,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      throttler.name,
    );

    if (totalHits > limit) {
      throw new ThrottlerException('Rate limit exceeded');
    }

    return true;
  }
}
