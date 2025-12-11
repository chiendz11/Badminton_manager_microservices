import { NestFactory } from '@nestjs/core';
import { BookingModule } from './booking.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(BookingModule);
  const port = process.env.PORT ?? 3000;

  await app.startAllMicroservices();

  // Lắng nghe tất cả các interface để Docker / API Gateway có thể kết nối
  await app.listen(port, '0.0.0.0');

  console.log(`Booking service running on port ${port}`);
}
bootstrap();