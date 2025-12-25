import { NestFactory } from '@nestjs/core';
import { BookingModule } from './booking.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(BookingModule);
  const port = process.env.PORT ?? 3000;

  await app.startAllMicroservices();
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Access at /api

  // Lắng nghe tất cả các interface để Docker / API Gateway có thể kết nối
  await app.listen(port, '0.0.0.0');

  console.log(`Booking service running on port ${port}`);
}
bootstrap();