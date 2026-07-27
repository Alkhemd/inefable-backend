import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  
  // Habilitar ValidationPipe global
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Habilitar CORS para el Frontend/PWA
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://inefable-frontend-yja4.vercel.app',
      'https://inefable-frontend-yja4-eylians-projects.vercel.app',
      /\.vercel\.app$/,   // Cualquier preview de Vercel
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 0.0.0.0 es necesario para Serverless/Docker
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
