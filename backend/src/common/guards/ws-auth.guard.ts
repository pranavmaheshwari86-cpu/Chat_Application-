import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WsException } from '@nestjs/websockets';
import { AuthenticatedSocket } from '@chat/shared';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    if (client.user) {
      return true;
    }

    try {
      let token = '';

      const authHeader = client.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else if (client.handshake.auth?.token) {
        token = client.handshake.auth.token;
      }

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      const user = await this.userModel
        .findById(payload.sub)
        .select('isBanned')
        .exec();
      if (user?.isBanned) {
        throw new WsException('Account has been suspended');
      }

      client.user = {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        displayName: payload.displayName,
      };

      return true;
    } catch (error) {
      this.logger.error(`WebSocket auth error: ${error.message}`);
      throw new WsException('Unauthorized');
    }
  }
}
