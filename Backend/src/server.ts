// Load .env before anything reads process.env.
import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http';

async function bootstrap() {
  // rawBody: the Stripe webhook must check its signature against the exact bytes sent
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.enableCors();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`Server started on port ${port}`, 'Bootstrap');
}

void bootstrap();
