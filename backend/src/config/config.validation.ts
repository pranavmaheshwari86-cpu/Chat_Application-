import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  MinLength,
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

  @IsString()
  @IsNotEmptyString({
    message: 'JWT_ACCESS_SECRET is required and cannot be empty',
  })
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters',
  })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmptyString({
    message: 'JWT_REFRESH_SECRET is required and cannot be empty',
  })
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters',
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmptyString({ message: 'CLIENT_URL is required' })
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
    throw new Error(
      `Environment variables validation failed:\n${messages.join('\n')}`,
    );
  }
  return validatedConfig;
}
