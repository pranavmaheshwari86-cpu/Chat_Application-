import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { APP_CONSTANTS } from '../../common/constants/app.constants';
import { TokenService, TokenPair } from './services/token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username, password, displayName } = registerDto;

    // Check existing email
    const existingEmail = await this.userModel.findOne({ email });
    if (existingEmail) {
      this.logger.warn(
        `Failed registration attempt: Email already in use (${email})`,
        { action: 'REGISTER_FAILED', email },
      );
      throw new ConflictException('Email already in use');
    }

    // Check existing username
    const existingUsername = await this.userModel.findOne({ username });
    if (existingUsername) {
      this.logger.warn(
        `Failed registration attempt: Username already taken (${username})`,
        { action: 'REGISTER_FAILED', username },
      );
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(
      password,
      APP_CONSTANTS.BCRYPT_ROUNDS,
    );

    const user = new this.userModel({
      email,
      username,
      displayName,
      passwordHash,
      provider: 'local',
    });

    const tokens = await this.tokenService.generateTokens(user);
    await user.save();

    this.logger.log(`New user registered: ${username}`, {
      action: 'USER_REGISTERED',
      userId: user._id.toString(),
    });

    return tokens;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userModel
      .findOne({ email })
      .select('+passwordHash');

    if (!user || !user.passwordHash) {
      this.logger.warn(`Failed login attempt for email: ${email}`, {
        action: 'LOGIN_FAILED',
        email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for email: ${email}`, {
        action: 'LOGIN_FAILED',
        email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last seen and status
    user.status = 'online';
    user.lastSeen = new Date();

    const tokens = await this.tokenService.generateTokens(user);
    await user.save();

    return tokens;
  }

  async googleLogin(googleUser: Record<string, any>) {
    let user = await this.userModel.findOne({ email: googleUser.email });

    if (!user) {
      // Guarantee unique username with a deterministic loop
      let suffix = 0;
      const emailPrefix =
        typeof googleUser.email === 'string'
          ? googleUser.email.split('@')[0]
          : 'user';
      let username = emailPrefix;

      while (await this.userModel.findOne({ username })) {
        suffix++;
        username = `${emailPrefix}${suffix}`;
      }

      user = new this.userModel({
        email: googleUser.email,
        username,
        displayName: googleUser.displayName || googleUser.firstName,
        avatar: googleUser.picture,
        provider: 'google',
        providerId: googleUser.providerId,
        isVerified: true,
        status: 'online',
        lastSeen: new Date(),
      });
    } else {
      user.status = 'online';
      user.lastSeen = new Date();
    }

    const tokens = await this.tokenService.generateTokens(user);
    await user.save();

    this.logger.log(`User logged in: ${user.username}`, {
      action: 'USER_LOGIN',
      userId: user._id.toString(),
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.tokenService.revokeRefreshToken(userId);
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { status: 'offline', lastSeen: new Date() },
    });

    this.eventEmitter.emit('user.logout', { userId });

    this.logger.log(`User logged out: ${userId}`, {
      action: 'USER_LOGOUT',
      userId,
    });

    return { success: true };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+refreshTokenHash +tokenVersion');

    if (!user || !user.refreshTokenHash) {
      this.logger.warn(
        `Failed token refresh: User not found or no refresh token`,
        { action: 'TOKEN_REFRESH_FAILED', userId },
      );
      throw new UnauthorizedException('Access Denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      await this.tokenService.revokeRefreshToken(userId);
      this.eventEmitter.emit('user.logout', { userId });

      this.logger.error(
        `Refresh token reuse detected for user ${userId} — all sessions invalidated`,
        { action: 'TOKEN_REUSE_DETECTED', userId },
      );
      throw new UnauthorizedException('Access Denied');
    }

    try {
      return await this.tokenService.generateTokensWithAtomicRotation(
        user,
        refreshToken,
      );
    } catch (error) {
      if ((error as Error).message === 'TOKEN_ROTATION_RACE') {
        throw new UnauthorizedException('Access Denied');
      }
      throw error;
    }
  }
}
