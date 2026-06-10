import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
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

    await user.save();

    this.logger.log(`New user registered: ${username}`, {
      action: 'USER_REGISTERED',
      userId: user._id.toString(),
    });

    return this.generateTokens(user);
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
    await user.save();

    return this.generateTokens(user);
  }

  async googleLogin(googleUser: Record<string, any>) {
    let user = await this.userModel.findOne({ email: googleUser.email });

    if (!user) {
      // Create new user for google login
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      let username = googleUser.email.split('@')[0];

      // Ensure unique username

      const usernameExists = await this.userModel.findOne({ username });
      if (usernameExists) {
        username = `${username}${Math.floor(Math.random() * 10000)}`;
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
      // Update status
      user.status = 'online';
      user.lastSeen = new Date();
    }

    await user.save();

    this.logger.log(`User logged in: ${user.username}`, {
      action: 'USER_LOGIN',
      userId: user._id.toString(),
    });

    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1 },
      status: 'offline',
      lastSeen: new Date(),
    });

    // Emit logout event to forcefully disconnect sockets
    this.eventEmitter.emit('user.logout', { userId });

    this.logger.log(`User logged out: ${userId}`, {
      action: 'USER_LOGOUT',
      userId,
    });

    return { success: true };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userModel.findById(userId);
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
      this.logger.warn(`Failed token refresh: Invalid token`, {
        action: 'TOKEN_REFRESH_FAILED',
        userId,
      });
      throw new UnauthorizedException('Access Denied');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),

        expiresIn: this.configService.get<string>('jwt.accessExpiry') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),

        expiresIn: this.configService.get<string>('jwt.refreshExpiry') as any,
      }),
    ]);

    // Hash refresh token before saving
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      APP_CONSTANTS.BCRYPT_ROUNDS,
    );
    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        status: user.status,
      },
    };
  }
}
