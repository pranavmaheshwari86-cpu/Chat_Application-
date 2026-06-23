import { NestFactory } from '@nestjs/core';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './gateway/redis-io.adapter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.useGlobalInterceptors(new LoggerErrorInterceptor());

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

    // Security headers
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
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
      );
    } else {
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
    app.useGlobalInterceptors(new TransformInterceptor());

    // WebSocket adapter with Redis (optional)
    const redisIoAdapter = new RedisIoAdapter(app, configService);
    let redisConnected = false;
    try {
      await redisIoAdapter.connectToRedis();
      redisConnected = true;
    } catch {
      console.warn(
        `⚠️  Redis not available. Running without multi-server WebSocket support.`,
      );
    }

    if (redisConnected) {
      app.useWebSocketAdapter(redisIoAdapter);
    }

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
    }

    // Start listening BEFORE running heavy index syncs to ensure Railway Healthcheck passes
    await app.listen(port);
    console.log(`🚀 Server listening on port ${port} (${nodeEnv})`);
    console.log(`📡 Health check available at http://localhost:${port}/api/health`);

    // Sync indexes AFTER server is listening (non-blocking for healthcheck)
    if (isProduction) {
      try {
        const connection = app.get<Connection>(getConnectionToken());
        const modelNames = connection.modelNames();
        for (const modelName of modelNames) {
          const model = connection.model(modelName);
          await model.syncIndexes();
        }
        console.log(`✅ Indexes synchronized for ${modelNames.length} models`);
      } catch (err) {
        console.warn(`⚠️  Index sync failed (non-fatal): ${(err as Error).message}`);
      }
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`❌ Failed to start the server: ${err.message}`, err.stack);
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
