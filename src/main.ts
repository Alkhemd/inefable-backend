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
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:4173',
        'https://inefable-frontend-yja4.vercel.app',
        'https://inefable-frontend-yja4-eylians-projects.vercel.app',
        'https://inefable-frontend-yja4-git-main-eylians-projects.vercel.app',
        'https://inefable-frontend.vercel.app',
      ];

      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqueado para origen: ${origin}`), false);
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 0.0.0.0 es necesario para Serverless/Docker
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
