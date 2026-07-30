import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // trustProxy: true — necesario en producción (Render corre detrás de un balanceador),
    // para que @Ip() lea la IP real del cliente desde X-Forwarded-For en vez de la del proxy.
    new FastifyAdapter({ trustProxy: true }),
  );

  // Habilitar ValidationPipe global
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger solo fuera de producción: no queremos exponer el mapa completo
  // de la API (incluyendo endpoints de seguridad/antifraude) públicamente.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Inefable Wallet API')
      .setDescription('Documentación de la API del backend de Inefable Wallet')
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

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
void bootstrap();
