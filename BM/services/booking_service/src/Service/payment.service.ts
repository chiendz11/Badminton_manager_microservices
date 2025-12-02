import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from 'src/DTO/create-payment.DTO';
import { PayOS } from '@payos/node';;

@Injectable()
export class PaymentService {
  private payOS: PayOS;

  constructor() {
    this.payOS = new PayOS({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }

  private generateOrderCode() {
  const timestamp = Number(String(Date.now()).slice(-8)); 
  const random = Math.floor(Math.random() * 1000);
  return Number(`${timestamp}${random}`);
}

  async createPaymentLink(paymentData: CreatePaymentDto) {
    const payload = {
      orderCode: this.generateOrderCode(),
      amount: paymentData.amount,
      description: paymentData.description,
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl,
      items: paymentData.items ?? [],
      expiredAt: Math.floor(Date.now() / 1000) + (5 * 60),
    };
    const paymentLinkRes = (await this.payOS.paymentRequests.create(payload));
    return paymentLinkRes;
  }
  
  // Hàm xác thực dữ liệu Webhook (Quan trọng để tránh giả mạo)
  verifyWebhook(webhookData: any) {
    const data = this.payOS.webhooks.verify(webhookData);
    return data;
  }
}