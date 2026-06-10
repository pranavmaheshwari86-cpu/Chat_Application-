import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ServerEvents } from '../constants/socket-events';

@Catch(WsException, Error)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: Error | WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const error =
      exception instanceof WsException
        ? exception.getError()
        : exception.message;
    const details =
      exception instanceof WsException ? exception.message : 'Unknown error';

    client.emit(ServerEvents.ERROR, {
      success: false,
      error: {
        message:
          typeof error === 'string'
            ? error
            : (error as any).message || 'Internal server error',
        details,
      },
    });
  }
}
