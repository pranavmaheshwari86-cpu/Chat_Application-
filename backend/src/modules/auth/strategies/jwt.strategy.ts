import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from '@chat/shared';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') as string,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel
      .findById(payload.sub)
      .select('-passwordHash +refreshTokenHash')
      .exec();

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('User not found or session invalidated');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Account has been suspended');
    }

    return {
      userId: user._id.toString(),
      _id: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      role: user.role,
    };
  }
}
