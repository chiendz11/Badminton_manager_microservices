import { Test, TestingModule } from '@nestjs/testing';
import { PassPostService } from '../Service/pass-booking.service';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';

import { PassPost } from '../Schema/pass-booking.schema';
import { Booking, BookingStatus } from '../Schema/booking.schema';
import { InterestedUser } from '../Schema/interested_user.schema';
import { User } from '../Schema/user.schema';

const createMockQuery = (returnValue: any) => {
  const query: any = {};
  query.find = jest.fn().mockReturnThis();
  query.findOne = jest.fn().mockReturnThis();
  query.findById = jest.fn().mockReturnThis();
  query.select = jest.fn().mockReturnThis();
  query.sort = jest.fn().mockReturnThis();
  query.lean = jest.fn().mockReturnThis();
  query.exec = jest.fn().mockResolvedValue(returnValue);
  query.then = (resolve: any) => resolve(returnValue);
  return query;
};

const MOCK_ID = '507f1f77bcf86cd799439011';

class MockPassPostModel {
  save: any;
  constructor(private data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue({ _id: MOCK_ID, ...this.data });
  }
  static find = jest.fn();
  static findOne = jest.fn();
  static findById = jest.fn();
  static aggregate = jest.fn().mockReturnValue(createMockQuery([]));
}

const createMockModel = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn().mockReturnValue(createMockQuery([])),
});

const mockQueue = { add: jest.fn() };
const mockAmqp = { publish: jest.fn() };
const mockHttpService = { get: jest.fn() };

describe('PassPostService', () => {
  let service: PassPostService;
  let bookingModel: any;
  let interestedUserModel: any;
  let userModel: any;

  let mockBookingModel: any;
  let mockInterestedUserModel: any;
  let mockUserModel: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    MockPassPostModel.find.mockReturnValue(createMockQuery([]));
    MockPassPostModel.findOne.mockReturnValue(createMockQuery(null));
    MockPassPostModel.findById.mockReturnValue(createMockQuery(null));
    MockPassPostModel.aggregate.mockReturnValue(createMockQuery([]));

    mockBookingModel = createMockModel();
    mockInterestedUserModel = createMockModel();
    mockUserModel = createMockModel();

    // Default returns
    mockBookingModel.findOne.mockReturnValue(createMockQuery(null));
    mockBookingModel.findById.mockReturnValue(createMockQuery(null));
    
    mockInterestedUserModel.findOne.mockReturnValue(createMockQuery(null));
    
    mockUserModel.findOne.mockReturnValue(createMockQuery(null));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassPostService,
        { provide: getModelToken(PassPost.name), useValue: MockPassPostModel },
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(InterestedUser.name), useValue: mockInterestedUserModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getQueueToken('booking-expiration'), useValue: mockQueue },
        { provide: AmqpConnection, useValue: mockAmqp },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<PassPostService>(PassPostService);
    bookingModel = module.get(getModelToken(Booking.name));
    interestedUserModel = module.get(getModelToken(InterestedUser.name));
    userModel = module.get(getModelToken(User.name));
  });

  describe('checkInterest', () => {
    it('should return false if ID is invalid', async () => {
      const res = await service.checkInterest('user1', 'invalid-id');
      expect(res.isInterested).toBe(false);
    });

    it('should return true if record exists', async () => {
      interestedUserModel.findOne.mockReturnValue(createMockQuery({ _id: 'exist' }));
      const res = await service.checkInterest('user1', MOCK_ID);
      expect(res.isInterested).toBe(true);
    });
  });

  describe('toggleInterest', () => {
    it('should UNINTEREST if already exists', async () => {
      const mockDoc = {
        deleteOne: jest.fn().mockResolvedValue(true)
      };

      interestedUserModel.findOne.mockReturnValue(createMockQuery(mockDoc));

      const res = await service.toggleInterest('u1', MOCK_ID);

      expect(mockDoc.deleteOne).toHaveBeenCalled();
      expect(res.action).toBe('uninterested');
    });

    it('should INTEREST and Notify if not exists', async () => {
      // 1. Mock InterestedUser -> return NULL (chưa tồn tại)
      interestedUserModel.findOne.mockReturnValue(createMockQuery(null));

      // 2. Mock PassPost -> return Seller Info
      MockPassPostModel.findById.mockReturnValue(createMockQuery({ sellerId: 'seller_99' }));

      // 3. Mock User -> return Buyer Name (Dùng mockUserModel riêng biệt nên không ảnh hưởng interestedUserModel)
      userModel.findOne.mockReturnValue(createMockQuery({ name: 'Buyer Name' }));

      // 4. Mock Create
      interestedUserModel.create.mockResolvedValue({ userId: 'u1', postId: MOCK_ID });

      const res = await service.toggleInterest('u1', MOCK_ID);

      expect(interestedUserModel.create).toHaveBeenCalled();
      expect(mockAmqp.publish).toHaveBeenCalledWith(
        'notification_exchange',
        'create_notification',
        expect.objectContaining({ userId: 'seller_99' })
      );
      expect(res.action).toBe('interested');
    });
  });

  describe('createPassPost', () => {
    const mockDto = { bookingId: MOCK_ID, resalePrice: 50000, description: 'Pass gap' };
    const validFutureDate = new Date();
    validFutureDate.setHours(validFutureDate.getHours() + 5);

    it('should create post successfully', async () => {
      const mockBooking = {
        _id: MOCK_ID,
        userId: 'user_1',
        bookingStatus: BookingStatus.CONFIRMED,
        price: 100000,
        bookDate: validFutureDate,
        courtBookingDetails: [{ timeslots: [18, 19] }]
      };
      bookingModel.findById.mockReturnValue(createMockQuery(mockBooking));
      MockPassPostModel.findOne.mockReturnValue(createMockQuery(null));

      const result = await service.createPassPost('user_1', mockDto);

      expect(result).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should throw Forbidden if user is not owner', async () => {
      bookingModel.findById.mockReturnValue(createMockQuery({ userId: 'other_user', bookingStatus: BookingStatus.CONFIRMED }));
      await expect(service.createPassPost('user_1', mockDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllPassPosts / getPassPostsBySellerId', () => {
    const mockAggregatedPosts = [
      {
        _id: 'post1',
        discountPercent: 10.5,
        booking: { centerId: 'center_1', courtBookingDetails: [{ timeslots: [17] }] }
      }
    ];

    it('should fetch posts and enrich via HTTP', async () => {
      MockPassPostModel.aggregate.mockReturnValue(createMockQuery(mockAggregatedPosts));

      const mockCenterData = {
        name: 'Super Center',
        courts: [{ courtId: 'court_1', name: 'VIP Court' }]
      };
      mockHttpService.get.mockReturnValue(of({ data: mockCenterData }));

      const result = await service.getAllPassPosts('user_other');

      expect(result).toHaveLength(1);
      expect(result[0].booking.centerName).toBe('Super Center');
      expect(result[0].discountPercent).toBe(11);
    });
  });

  describe('getInterestedUsersByPostId', () => {
    it('should throw BadRequest if postId invalid', async () => {
      await expect(service.getInterestedUsersByPostId('invalid')).rejects.toThrow(BadRequestException);
    });

    it('should call aggregate if valid', async () => {
      interestedUserModel.aggregate.mockReturnValue(createMockQuery([]));
      await service.getInterestedUsersByPostId(MOCK_ID);
      expect(interestedUserModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('countInterestedUsers', () => {
    it('should return count', async () => {
      interestedUserModel.countDocuments.mockResolvedValue(5);
      const count = await service.countInterestedUsers(MOCK_ID);
      expect(count).toBe(5);
    });
  });
});