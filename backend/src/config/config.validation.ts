import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  IsOptional,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

function IsNotEmptyString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotEmptyString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && value.trim().length > 0;
        },
        defaultMessage(args?: any) {
          return `${args?.property || 'Field'} must be a non-empty string`;
        },
      },
    });
  };
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  @IsNotEmptyString({ message: 'MONGODB_URI is required' })
  MONGODB_URI: string;

  @IsOptional()
  @IsString()
  REDIS_HOST: string;

  @IsOptional()
  @IsNumber()
  REDIS_PORT: number;

  @IsOptional()
  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  CLIENT_URL: string;

  @IsOptional()
  @IsString()
  GEMINI_API_KEY: string;

  @IsOptional()
  @IsString()
  OPENROUTER_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((error) => {
      return `${error.property} - ${Object.values(error.constraints || {}).join(', ')}`;
    });
    // Only crash on truly critical missing vars (NODE_ENV, PORT, MONGODB_URI)
    const criticalProps = ['NODE_ENV', 'PORT', 'MONGODB_URI'];
    const criticalErrors = errors.filter((e) =>
      criticalProps.includes(e.property),
    );

    if (criticalErrors.length > 0) {
      throw new Error(
        `Critical environment variables missing:\n${messages.join('\n')}`,
      );
    }

    // Non-critical: warn but don't crash
    console.warn(
      `⚠️  Environment variable warnings:\n${messages.join('\n')}`,
    );
  }
  return validatedConfig;
}
