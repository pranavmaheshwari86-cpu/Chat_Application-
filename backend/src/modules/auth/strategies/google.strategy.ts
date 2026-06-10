import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId') || 'dummy',
      clientSecret: configService.get<string>('google.clientSecret') || 'dummy',
      callbackURL:
        configService.get<string>('google.callbackUrl') ||
        'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;

    // We just return the profile data, the actual logic is handled in the controller/service
    const user = {
      email: emails[0].value,

      firstName: name.givenName,

      lastName: name.familyName,

      displayName: profile.displayName,

      picture: photos[0].value,

      providerId: id,
      provider: 'google',
      accessToken,
    };

    done(null, user);
  }
}
