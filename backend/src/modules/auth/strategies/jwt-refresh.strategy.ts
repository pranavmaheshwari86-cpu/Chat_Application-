import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from '@chat/shared';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['refreshToken'];
          }

          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret') as string,
      passReqToCallback: true,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(request: Request, payload: JwtPayload) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    return {
      ...payload,

      refreshToken,
    };
  }
}
