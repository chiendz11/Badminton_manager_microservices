import { Injectable, Logger } from '@nestjs/common';
import { CreatePaymentDto } from 'src/DTO/create-payment.DTO';

// Sử dụng require để tránh lỗi "is not a constructor"
const payosModule = require('@payos/node');
const PayOS = payosModule.PayOS || payosModule;

@Injectable()
export class PaymentService {
  private payOS: any;
  private readonly logger = new Logger(PaymentService.name);

  constructor() {
    try {
      this.payOS = new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        process.env.PAYOS_CHECKSUM_KEY,
      );
      this.logger.log('PayOS Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PayOS', error);
    }
  }

  private generateOrderCode() {
    const timestamp = Number(String(Date.now()).slice(-6));
    const random = Math.floor(Math.random() * 1000);
    return Number(`${timestamp}${random}`);
  }

  async createPaymentLink(paymentData: CreatePaymentDto) {
    const items = Array.isArray(paymentData.items) 
      ? paymentData.items.map(item => ({ 
          name: item.name, 
          quantity: item.quantity, 
          price: item.price 
        }))
      : [];

    // --- LOGIC THỜI GIAN ---
    // Lấy thời gian hiện tại (tính bằng giây)
    const createdAt = Math.floor(Date.now() / 1000);
    // Link hết hạn sau 5 phút (300 giây) tính từ lúc tạo
    const expiredAt = createdAt + 300; 

    const payload = {
      orderCode: this.generateOrderCode(),
      amount: paymentData.amount,
      description: paymentData.description || 'Thanh toan',
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl,
      items: items,
      expiredAt: expiredAt, // Gửi cho PayOS biết link này chỉ sống 5 phút
    };

    try {
      const paymentLinkRes = await this.payOS.paymentRequests.create(payload);
      
      this.logger.log(`Created PayOS Link: ${payload.orderCode}`);

      // TRẢ VỀ DỮ LIỆU KÈM createdAt ĐỂ FE TÍNH TOÁN
      return {
        ...paymentLinkRes,
        createdAt: createdAt // Trả về timestamp lúc tạo
      }; 

    } catch (error) {
      this.logger.error('Error creating PayOS link:', error);
      throw error; 
    }
  }

  verifyWebhook(webhookData: any) {
    return this.payOS.webhooks.verify(webhookData);
  }
}