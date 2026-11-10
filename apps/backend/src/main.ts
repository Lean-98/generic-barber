import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // En producción los pedidos pasan por dos proxies propios: el Nginx de la
  // VPS (que ya resuelve la IP real detrás de Cloudflare) y el del frontend.
  // Sin esto, req.ip es la del proxy y el rate limit es global para todos los
  // clientes. Con 2 se toma la IP que agregó el Nginx de la VPS, que el
  // cliente no puede falsificar (no usar `true`).
  app.set('trust proxy', 2);

  // 0. Cabeceras de seguridad. CSP desactivada porque rompe los assets
  // inline que usa Swagger UI (montado más abajo).
  app.use(helmet({ contentSecurityPolicy: false }));

  // 0.b Necesario para leer la cookie del dispositivo confiable en /auth/login.
  app.use(cookieParser());

  // 1. Global prefix
  app.setGlobalPrefix('api');

  // 2. Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 2b. Errores de Prisma -> respuestas HTTP claras
  app.useGlobalFilters(new PrismaExceptionFilter());

  // 3. CORS: solo los orígenes explícitamente permitidos. `origin: true`
  // reflejaba cualquier origen, lo que combinado con `credentials: true`
  // anulaba la protección de CORS por completo.
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // 4. Swagger Document - solo fuera de producción: en prod expondría toda
  // la superficie de la API (rutas, DTOs) sin autenticación a quien la pida.
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Peluquería API')
      .setDescription('API de gestión para peluquería')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);

    // 5. Swagger UI - montado directamente con swagger-ui-express
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(document));

    // 6. Swagger JSON endpoint
    app.getHttpAdapter().get('/api/docs-json', (req: any, res: any) => {
      res.json(document);
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`✅ API running: http://localhost:${port}/api`);
  if (!isProduction) {
    console.log(`✅ Swagger UI: http://localhost:${port}/api/docs`);
    console.log(`✅ Swagger JSON: http://localhost:${port}/api/docs-json`);
  }
}
bootstrap();
