import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  if (!accessSecret || accessSecret.trim().length === 0) {
    console.error(
      '⚠️  JWT_ACCESS_SECRET is missing. Auth will not work. Generate with: openssl rand -hex 32',
    );
  }
  if (!refreshSecret || refreshSecret.trim().length === 0) {
    console.error(
      '⚠️  JWT_REFRESH_SECRET is missing. Auth will not work. Generate with: openssl rand -hex 32',
    );
  }

  return {
    accessSecret: accessSecret || 'MISSING_JWT_ACCESS_SECRET',
    refreshSecret: refreshSecret || 'MISSING_JWT_REFRESH_SECRET',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  };
});
