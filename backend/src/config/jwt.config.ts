import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || accessSecret.trim().length === 0) {
    throw new Error(
      'JWT_ACCESS_SECRET is required and cannot be empty. Generate with: openssl rand -hex 32',
    );
  }
  if (!refreshSecret || refreshSecret.trim().length === 0) {
    throw new Error(
      'JWT_REFRESH_SECRET is required and cannot be empty. Generate with: openssl rand -hex 32',
    );
  }
  if (accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
  }
  if (refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
  }

  return {
    accessSecret,
    refreshSecret,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  };
});
