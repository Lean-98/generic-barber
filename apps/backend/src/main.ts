import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as swaggerUi from 'swagger-ui-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // 3. CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 4. Swagger Document
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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`✅ API running: http://localhost:${port}/api`);
  console.log(`✅ Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`✅ Swagger JSON: http://localhost:${port}/api/docs-json`);
}
bootstrap();
