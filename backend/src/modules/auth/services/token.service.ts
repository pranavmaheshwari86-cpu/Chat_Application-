import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { APP_CONSTANTS } from '../../../common/constants/app.constants';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: {
    _id: any;
    email: string;
    username: string;
    displayName: string | undefined;
    avatar: string | undefined;
    status: string;
  };
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private buildPayload(user: UserDocument) {
    return {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    };
  }

  private async signTokens(payload: Record<string, any>) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret')!,
        expiresIn: this.configService.get<string>('jwt.accessExpiry') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret')!,
        expiresIn: this.configService.get<string>('jwt.refreshExpiry') as any,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(refreshToken, APP_CONSTANTS.BCRYPT_ROUNDS);
  }

  private buildUserResponse(user: UserDocument) {
    return {
      _id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
    };
  }

  async generateTokens(user: UserDocument): Promise<TokenPair> {
    const payload = this.buildPayload(user);
    const { accessToken, refreshToken } = await this.signTokens(payload);
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);
    user.refreshTokenHash = refreshTokenHash;
    // NOTE: Caller is responsible for saving the user to avoid double-save
    // when caller also updates other fields (status, lastSeen, etc.)

    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user),
    };
  }

  async generateTokensWithAtomicRotation(
    user: UserDocument,
    currentRefreshToken: string,
  ): Promise<TokenPair> {
    const payload = this.buildPayload(user);
    const { accessToken, refreshToken: newRefreshToken } =
      await this.signTokens(payload);
    const newRefreshTokenHash = await this.hashRefreshToken(newRefreshToken);

    const result = await this.userModel
      .findOneAndUpdate(
        {
          _id: user._id,
          tokenVersion: user.tokenVersion,
          refreshTokenHash: user.refreshTokenHash,
        },
        {
          $set: { refreshTokenHash: newRefreshTokenHash },
          $inc: { tokenVersion: 1 },
        },
        { new: true },
      )
      .select('+refreshTokenHash +tokenVersion')
      .exec();

    if (!result) {
      this.logger.warn(
        `Concurrent refresh token rotation detected for user ${user._id}`,
        { action: 'TOKEN_ROTATION_RACE', userId: user._id.toString() },
      );
      throw new Error('TOKEN_ROTATION_RACE');
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.buildUserResponse(result),
    };
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1 },
      $set: { tokenVersion: 0 },
    });
  }
}
