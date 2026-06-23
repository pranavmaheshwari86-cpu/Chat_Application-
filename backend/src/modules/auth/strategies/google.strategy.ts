import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    const callbackURL = configService.get<string>('google.callbackUrl');

    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL: callbackURL || '/api/auth/google/callback',
      scope: ['email', 'profile'],
      state: false,
    });
  }

  authorizationParams(): Record<string, string> {
    return {
      access_type: 'offline',
      prompt: 'select_account',
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;

    const email = emails?.[0]?.value;
    if (!email) {
      return done(
        new UnauthorizedException('Google account must have a verified email'),
        false,
      );
    }

    const user = {
      email,
      firstName: name?.givenName || null,
      lastName: name?.familyName || null,
      displayName:
        profile.displayName || name?.givenName || email.split('@')[0],
      picture: photos?.[0]?.value || null,
      providerId: id,
      provider: 'google',
      accessToken,
    };

    done(null, user);
  }
}
