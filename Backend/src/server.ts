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
  // 0.0.0.0 explicitly: Render only detects ports bound there (Node's default address
  // didn't show up for it on Node 26, so the deploy timed out)
  await app.listen(port, '0.0.0.0');
  Logger.log(`Server started on 0.0.0.0:${port}`, 'Bootstrap');
}

void bootstrap();
