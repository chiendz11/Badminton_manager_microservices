import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../Service/payment.service';
import { CreatePaymentDto } from 'src/DTO/create-payment.DTO';
import { Logger } from '@nestjs/common';

const mockCreate = jest.fn();
const mockVerify = jest.fn();

jest.mock('@payos/node', () => {
  return function () {
    return {
      paymentRequests: {
        create: mockCreate,
      },
      webhooks: {
        verify: mockVerify,
      },
    };
  };
});

describe('PaymentService', () => {
  let service: PaymentService;
  const env = process.env;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    process.env = {
      ...env,
      PAYOS_CLIENT_ID: 'mock-client-id',
      PAYOS_API_KEY: 'mock-api-key',
      PAYOS_CHECKSUM_KEY: 'mock-checksum-key',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterAll(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentLink', () => {
    const mockDto: CreatePaymentDto = {
      amount: 50000,
      bookingId: 'booking_123',
      description: 'alo123',
      returnUrl: 'http://return',
      cancelUrl: 'http://cancel',
    };

    it('should create payment link successfully', async () => {
      const mockPayOSResponse = {
        checkoutUrl: 'https://pay.os/checkout/123',
        paymentLinkId: 'link_123',
      };
      mockCreate.mockResolvedValue(mockPayOSResponse);

      const result = await service.createPaymentLink(mockDto);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: mockDto.amount,
          description: mockDto.bookingId,
          returnUrl: mockDto.returnUrl,
          cancelUrl: mockDto.cancelUrl,
          orderCode: expect.any(Number),
          expiredAt: expect.any(Number),
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          ...mockPayOSResponse,
          createdAt: expect.any(Number),
        }),
      );
    });

    it('should throw error if PayOS fails', async () => {
      mockCreate.mockRejectedValue(new Error('PayOS API Error'));

      await expect(service.createPaymentLink(mockDto)).rejects.toThrow('PayOS API Error');
    });
  });

  describe('verifyWebhook', () => {
    it('should verify webhook data successfully', () => {
      const mockWebhookData = { code: '00', data: {} };
      const mockVerifiedData = { valid: true };

      mockVerify.mockReturnValue(mockVerifiedData);

      const result = service.verifyWebhook(mockWebhookData);

      expect(mockVerify).toHaveBeenCalledWith(mockWebhookData);
      expect(result).toEqual(mockVerifiedData);
    });
  });
});