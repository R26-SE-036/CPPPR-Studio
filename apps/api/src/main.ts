import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — strips unknown fields, validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for local dev (Next.js on 3000)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger UI at /api/docs
  const config = new DocumentBuilder()
    .setTitle('CPPPR Studio API')
    .setDescription('Collaborative Pair Programming and Peer Review Studio')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 4000);
  console.log(`🚀 API running at http://localhost:${process.env.PORT || 4000}`);
  console.log(
    `📚 Swagger at http://localhost:${process.env.PORT || 4000}/api/docs`,
  );
}

void bootstrap();
