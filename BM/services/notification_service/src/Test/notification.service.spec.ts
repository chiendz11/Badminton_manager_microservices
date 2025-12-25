import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../Service/notification.service';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from '../Schema/notification.schema';

const mockQuery = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

class MockNotificationModel {
  constructor(private data: any) {}

  save() {
    return Promise.resolve(this.data);
  }

  static find = jest.fn().mockReturnValue(mockQuery);
  static updateMany = jest.fn();
  static countDocuments = jest.fn();
}

describe('NotificationService', () => {
  let service: NotificationService;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getModelToken(Notification.name),
          useValue: MockNotificationModel,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleBookingNotification', () => {
    it('should create and save notification successfully', async () => {
      const msg = {
        userId: 'user123',
        notiMessage: 'Booking confirmed',
        notiType: 'INFO',
      };

      const saveSpy = jest.spyOn(MockNotificationModel.prototype, 'save');

      await service.handleBookingNotification(msg);

      expect(saveSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Đã lưu thông báo'));
    });

    it('should catch error if save fails', async () => {
      const saveSpy = jest.spyOn(MockNotificationModel.prototype, 'save')
                          .mockImplementation(() => Promise.reject(new Error('DB Error')));

      const msg = { userId: 'user123' };
      await service.handleBookingNotification(msg);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Lỗi khi lưu thông báo'),
        expect.any(Error)
      );

      saveSpy.mockRestore();
    });
  });

  describe('getNotifications', () => {
    it('should find, sort, limit and return notifications', async () => {
      const mockResult = [{ msg: 'hello' }];
      mockQuery.exec.mockResolvedValue(mockResult);

      const result = await service.getNotifications('user123');

      expect(MockNotificationModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('markAsRead', () => {
    it('should update unread notifications', async () => {
      const updateResult = { modifiedCount: 5 };
      MockNotificationModel.updateMany.mockResolvedValue(updateResult);

      const result = await service.markAsRead('user123');

      expect(MockNotificationModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123', isRead: false },
        { $set: { isRead: true } }
      );
      expect(result).toEqual(updateResult);
    });
  });

  describe('countUnread', () => {
    it('should return unread count', async () => {
      MockNotificationModel.countDocuments.mockResolvedValue(10);

      const result = await service.countUnread('user123');

      expect(MockNotificationModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user123',
        isRead: false,
      });
      expect(result).toEqual({ unreadCount: 10 });
    });
  });
});