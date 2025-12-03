import { Controller, Post, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import { PaymentService } from 'src/Service/payment.service';
import { CreatePaymentDto } from 'src/DTO/create-payment.DTO';
import type { Response } from 'express';
import { BookingService } from 'src/Service/booking.service';
import { BookingStatus } from 'src/Schema/booking.schema';

@Controller('api/payment')
export class PaymentController {
  private readonly Logger = new Logger(PaymentController.name);
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
) {}

  @Post('create-link')
  async createLink(@Body() body: CreatePaymentDto, @Res() res: Response) {
    try {
      this.Logger.log('Creating PayOS payment link with data:', body);
      const paymentLink = await this.paymentService.createPaymentLink(body);
      return res.status(HttpStatus.OK).json(paymentLink);

    } catch (error) {
      console.error(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        message: 'Lỗi tạo link thanh toán',
        error: error.message 
      });
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    try {
      this.Logger.log('Received PayOS webhook with data:', body);
      const webhookData = await this.paymentService.verifyWebhook(body); 
      const match = webhookData.description.match(/[a-f0-9]{24}/);
      if (!match) {
        console.error('Không tìm thấy bookingId trong description:', webhookData.description);
        return res.status(HttpStatus.OK).json({ success: true });
      }
      const bookingId = match[0];

      const modifiedBooking = await this.bookingService.updateBookingStatusToConfirmed(bookingId);

      if (!modifiedBooking) {
        console.error('Không tìm thấy booking với orderCode:', webhookData.orderCode);
        return res.status(HttpStatus.OK).json({ success: true });
      }
      return res.status(HttpStatus.OK).json({ success: true });
      
    } catch (error) {
      console.error('Lỗi xác thực webhook:', error);
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Dữ liệu không hợp lệ' });
    }
  }
}