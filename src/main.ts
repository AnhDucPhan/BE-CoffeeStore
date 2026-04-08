import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  app.enableCors({
    origin: ['http://localhost:3000', 'https://order-web-7ayq.vercel.app'], // Cho phép Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Cho phép cookie/token
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // loại bỏ field thừa
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // 👈 Dòng này giúp tự ép kiểu string -> number ở DTO
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port,'0.0.0.0');
  new Logger('Bootstrap').log(`🚀 Running on http://localhost:${port}`);
}
bootstrap();
