import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { PaymentService } from 'src/Service/payment.service';
import { CreatePaymentDto } from 'src/DTO/create-payment.DTO';
import type { Response } from 'express';
import { BookingService } from 'src/Service/booking.service';
import { BookingStatus } from 'src/Schema/booking.schema';

@Controller('api/payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService
) {}

  @Post('create-link')
  async createLink(@Body() body: CreatePaymentDto, @Res() res: Response) {
    try {
      // Gọi Service (Hàm này đã được sửa ở bước trước để trả về full object)
      const paymentLink = await this.paymentService.createPaymentLink(body);

      // 🔥 SỬA LẠI CHỖ NÀY:
      // Thay vì chỉ trả về { url: ... }, hãy trả về nguyên object paymentLink
      return res.status(HttpStatus.OK).json(paymentLink);

      /* * LƯU Ý: Nếu bạn muốn bọc trong cấu trúc chuẩn, có thể viết:
       * return res.status(HttpStatus.OK).json({
       * error: 0,
       * message: "Success",
       * data: paymentLink 
       * });
       * Nhưng nếu làm vậy, ở Frontend nhớ gọi response.data.data.bin nhé!
       */

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