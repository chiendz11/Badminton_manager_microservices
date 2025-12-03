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

    const createdAt = Math.floor(Date.now() / 1000);
    const expiredAt = createdAt + 300; 

    const payload = {
      orderCode: this.generateOrderCode(),
      amount: paymentData.amount,
      description: paymentData.bookingId,
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl,
      items: [],
      expiredAt: expiredAt,
    };

    try { 
      const paymentLinkRes = await this.payOS.paymentRequests.create(payload);
      
      this.logger.log(`Created PayOS Link: ${payload.orderCode}`);
      return {
        ...paymentLinkRes,
        createdAt: createdAt
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