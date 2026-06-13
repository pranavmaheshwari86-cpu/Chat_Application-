import { NestFactory } from '@nestjs/core';

import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './gateway/redis-io.adapter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { StructuredLogger } from './common/logger/structured-logger.service';

async function bootstrap() {
  const logger = new StructuredLogger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
    });
    app.useLogger(app.get(StructuredLogger));

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 4000);
    const clientUrl = configService.get<string>(
      'CLIENT_URL',
      'http://localhost:3000',
    );
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    // CORS — strict allowlist, not origin: true
    app.enableCors({
      origin: [clientUrl],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    // Security headers — production-safe Helmet configuration
    if (isProduction) {
      app.use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: [
                "'self'",
                'data:',
                'https://res.cloudinary.com',
                'https://lh3.googleusercontent.com',
              ],
              connectSrc: ["'self'", clientUrl],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            },
          },
          crossOriginEmbedderPolicy: false, // Prevents blocking of third-party media like Cloudinary/Google
          crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows API consumption from frontend domain
        }),
      );
    } else {
      // Development — relaxed for cross-origin dev servers
      app.use(
        helmet({
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: false,
        }),
      );
    }
    app.use(cookieParser());

    // Global prefix
    app.setGlobalPrefix('api');

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global filters
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global interceptors
    app.useGlobalInterceptors(new LoggingInterceptor());

    // WebSocket adapter with Redis
    const redisIoAdapter = new RedisIoAdapter(app, configService);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

    // Swagger — disabled in production
    if (!isProduction) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('FlashChat API')
        .setDescription('Production-grade real-time chat platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('refreshToken')
        .build();
      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('api/docs', app, document);
      logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
    }

    await app.listen(port);
    logger.log(`🚀 FlashChat server running on http://localhost:${port}`);
  } catch (error) {
    logger.error(
      `❌ Failed to start the server: ${error.message}`,

      error.stack,
    );
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
