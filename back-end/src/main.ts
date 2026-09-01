import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';
import { FileLoggerService } from './common/services/file-logger.service';

async function bootstrap() {
  const logger = new FileLoggerService();
  const app = await NestFactory.create(AppModule, { logger });

  const frontendDir = join(process.cwd(), '..', 'front-end');
  if (existsSync(frontendDir)) {
    const staticOptions = { index: ['index.html', 'landing_page.html'] };
    app.use(express.static(frontendDir, staticOptions));
    app.use('/front-end', express.static(frontendDir, staticOptions));
  }

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  const uploadDir = join(process.cwd(), 'uploads');
  if (existsSync(uploadDir)) {
    app.use('/uploads', express.static(uploadDir));
  }

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-role', 'x-user-email'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Dream Destination Review 4 API')
    .setDescription(
      'NestJS in-memory REST API with RBAC header authorization for traveler, travel partner, tour guide, vendor, support, and super user portals.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-role',
        in: 'header',
        description:
          'Role header required on every API. Use Super User, Traveler, Travel Partner, Tour Guide, Vendor, or Support Executive.',
      },
      'x-role',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const docsDir = join(process.cwd(), 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
  const swaggerPath = join(docsDir, 'swagger.json');
  const newSwaggerStr = JSON.stringify(document, null, 2);
  if (!existsSync(swaggerPath)) {
    writeFileSync(swaggerPath, newSwaggerStr);
  }

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  logger.log('Application initialized and listening on port ' + (process.env.PORT || 3000), 'Bootstrap');
}

bootstrap();
