import { NestFactory } from '@nestjs/core';
import dns from 'dns';

// dns.setServers(['8.8.8.8', '1.1.1.1']);

import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './gateway/redis-io.adapter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { StructuredLogger } from './common/logger/structured-logger.service';

import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

async function bootstrap() {
  const logger = new StructuredLogger('Bootstrap');
  try {
    // Persistent MongoDB: data survives restarts via a local dbPath folder
    const dbPath = path.join(__dirname, '..', 'mongodb-data');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });
    process.env.MONGODB_URI = mongod.getUri();
    logger.log(
      `🟢 Persistent MongoDB started at ${process.env.MONGODB_URI} (data: ${dbPath})`,
    );

    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },
    });
    app.useLogger(app.get(StructuredLogger));

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 4000);

    const clientUrl = configService.get<string>(
      'CLIENT_URL',
      'http://localhost:3000',
    );

    // Security — disable CSP in development to avoid blocking cross-origin requests
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
      }),
    );
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
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // WebSocket adapter with Redis
    const redisIoAdapter = new RedisIoAdapter(app, configService);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

    // Swagger
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FlashChat API')
      .setDescription('Production-grade real-time chat platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refreshToken')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(port);
    logger.log(`🚀 FlashChat server running on http://localhost:${port}`);
    logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
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
