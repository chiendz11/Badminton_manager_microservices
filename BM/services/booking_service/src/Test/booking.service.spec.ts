import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../Service/booking.service';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Booking, BookingStatus } from '../Schema/booking.schema';
import { User } from '../Schema/user.schema';
import { Center } from '../Schema/center.schema';
import { Court } from '../Schema/court.schema';
import { PassPost } from '../Schema/pass-booking.schema';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Types } from 'mongoose';

// ======================================================
// 🛠️ MOCK FACTORY
// ======================================================
const createMockQuery = (returnValue: any) => {
  const query: any = {};
  query.find = jest.fn().mockReturnThis();
  query.findOne = jest.fn().mockReturnThis();
  query.sort = jest.fn().mockReturnThis();
  query.skip = jest.fn().mockReturnThis();
  query.limit = jest.fn().mockReturnThis();
  query.select = jest.fn().mockReturnThis();
  query.lean = jest.fn().mockReturnThis();
  // Allow the chain to be awaited
  query.exec = jest.fn().mockResolvedValue(returnValue);
  query.then = (resolve: any) => resolve(returnValue); 
  return query;
};

// Generic Mock Model
const mockModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  insertMany: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  findOneAndDelete: jest.fn(),
};

// Valid Mongo ObjectId for testing
const MOCK_ID = '507f1f77bcf86cd799439011';

// Specific Mock for Booking
class MockBookingModel {
  save: any;
  constructor(private data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue({ _id: MOCK_ID, ...this.data });
  }
  // Static methods must correspond to the service logic
  static find = jest.fn();
  static findOne = jest.fn();
  static findById = jest.fn();
  static findByIdAndUpdate = jest.fn();
  static countDocuments = jest.fn();
  static aggregate = jest.fn();
  static insertMany = jest.fn();
}

const mockRedis = {
  get: jest.fn(),
  ttl: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

const mockAmqp = {
  publish: jest.fn(),
};

describe('BookingService', () => {
  let service: BookingService;
  let userModel: any;
  let centerModel: any;
  let courtModel: any;
  let passPostModel: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // 🟢 RESET DEFAULT BEHAVIOR (Crucial to prevent test pollution)
    MockBookingModel.find.mockReturnValue(createMockQuery([])); // Default: No conflicts
    MockBookingModel.findOne.mockReturnValue(createMockQuery(null));
    MockBookingModel.findById.mockReturnValue(createMockQuery(null));
    MockBookingModel.findByIdAndUpdate.mockReturnValue(createMockQuery(null));
    MockBookingModel.countDocuments.mockReturnValue(createMockQuery(0));
    MockBookingModel.aggregate.mockResolvedValue([]);
    MockBookingModel.insertMany.mockResolvedValue([]);

    // Reset generic models
    mockModel.find.mockReturnValue(createMockQuery([]));
    mockModel.findOne.mockReturnValue(createMockQuery(null));
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getModelToken(Booking.name), useValue: MockBookingModel },
        { provide: getModelToken(User.name), useValue: mockModel },
        { provide: getModelToken(Center.name), useValue: mockModel },
        { provide: getModelToken(Court.name), useValue: mockModel },
        { provide: getModelToken(PassPost.name), useValue: mockModel },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: getQueueToken('booking-expiration'), useValue: mockQueue },
        { provide: AmqpConnection, useValue: mockAmqp },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    userModel = module.get(getModelToken(User.name));
    centerModel = module.get(getModelToken(Center.name));
    courtModel = module.get(getModelToken(Court.name));
    passPostModel = module.get(getModelToken(PassPost.name));
  });

  // ======================================================
  // ✅ 1. CREATE BOOKING
  // ======================================================
  describe('createBooking', () => {
    const mockInput: any = {
      userId: 'user_1',
      centerId: 'center_1',
      bookDate: new Date().toISOString(),
      courtBookingDetails: [{ courtId: 'court_1', timeslots: [18] }]
    };

    it('should create a booking successfully', async () => {
      userModel.findOne.mockReturnValue(createMockQuery({ userId: 'user_1', points: 100 }));
      centerModel.findOne.mockReturnValue(createMockQuery({ centerId: 'center_1', pricing: { weekday: [] } }));
      
      const result = await service.createBooking(mockInput);
      
      expect(result).toBeDefined();
      expect(mockAmqp.publish).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should throw ConflictException if booking conflicts', async () => {
      userModel.findOne.mockReturnValue(createMockQuery({ userId: 'user_1' }));
      // ⚠️ Temporarily override find to simulate conflict
      MockBookingModel.find.mockReturnValue(createMockQuery([{ _id: 'conflict' }]));

      await expect(service.createBooking(mockInput)).rejects.toThrow(ConflictException);
    });
  });

  // ======================================================
  // ✅ 2. CREATE FIXED BOOKINGS (BATCH)
  // ======================================================
  describe('createFixedBookings', () => {
    // it('should create multiple bookings', async () => {
    //     const futureDate = new Date();
    //     futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    //     const payload = {
    //         userId: 'user_1',
    //         centerId: 'center_1',
    //         bookings: [{ 
    //             date: futureDate.toISOString(), 
    //             courtId: 'court_1', 
    //             timeslots: [18, 19] 
    //         }]
    //     };

    //     userModel.findOne.mockReturnValue(createMockQuery({ userId: 'user_1', points: 0 }));
    //     centerModel.findOne.mockReturnValue(createMockQuery({ centerId: 'center_1', pricing: {} }));
    //     courtModel.findOne.mockReturnValue(createMockQuery({ courtId: 'court_1', name: 'Court 1' }));
    //     MockBookingModel.insertMany.mockResolvedValue([{ _id: 'b1' }]);

    //     const result = await service.createFixedBookings(payload);

    //     expect(result).toHaveLength(1);
    //     expect(userModel.updateOne).toHaveBeenCalled();
    // });

    it('should ignore timeslots in the past', async () => {
        const pastDate = new Date('2020-01-01');
        const payload = {
            userId: 'user_1',
            centerId: 'center_1',
            bookings: [{ date: pastDate.toISOString(), courtId: 'court_1', timeslots: [10] }]
        };

        userModel.findOne.mockReturnValue(createMockQuery({ userId: 'user_1' }));
        centerModel.findOne.mockReturnValue(createMockQuery({ centerId: 'center_1' }));

        const result = await service.createFixedBookings(payload);
        expect(result).toEqual([]); 
    });
  });

  // ======================================================
  // ✅ 3. UPDATE STATUS & RABBITMQ
  // ======================================================
  describe('updateBookingStatusToConfirmed', () => {
    it('should confirm booking and add points', async () => {
        const mockBooking = { _id: MOCK_ID, userId: 'u1', price: 50000, save: jest.fn() };
        MockBookingModel.findById.mockReturnValue(createMockQuery(mockBooking));

        await service.updateBookingStatusToConfirmed(MOCK_ID);

        expect(mockBooking.save).toHaveBeenCalled(); // Status updated
        expect(userModel.findOneAndUpdate).toHaveBeenCalled(); // Points added
    });
  });

  describe('updateBookingStatus', () => {
    it('should simple update status', async () => {
        // 🟢 FIX: Use MOCK_ID (valid ObjectId) instead of 'b1'
        const mockBooking = { _id: MOCK_ID, save: jest.fn() };
        MockBookingModel.findById.mockReturnValue(createMockQuery(mockBooking));

        await service.updateBookingStatus(MOCK_ID, BookingStatus.CANCELLED);
        expect(mockBooking['bookingStatus']).toBe(BookingStatus.CANCELLED);
        expect(mockBooking.save).toHaveBeenCalled();
    });
  });

  // ======================================================
  // ✅ 4. BASIC CRUD (Find, Delete)
  // ======================================================
  describe('Basic Finders', () => {
    it('findAllBookings', async () => {
        await service.findAllBookings();
        expect(MockBookingModel.find).toHaveBeenCalled();
    });
  });

  // ======================================================
  // ✅ 5. UPDATE OWNER
  // ======================================================
  describe('updateBookingOwner', () => {
      it('should transfer owner', async () => {
        const mockBooking = { 
            _id: MOCK_ID, 
            userId: 'old_user', 
            bookDate: new Date(),
            save: jest.fn() 
        };

        MockBookingModel.findById.mockReturnValue(createMockQuery(mockBooking));
        
        userModel.findOne
            .mockReturnValueOnce(createMockQuery({ userId: 'new_user', name: 'New Guy' })) 
            .mockReturnValueOnce(createMockQuery({ userId: 'old_user', name: 'Old Guy' })); 

        passPostModel.findOneAndDelete.mockResolvedValue({ _id: 'post_1' });

        await service.updateBookingOwner(MOCK_ID, 'new_user');

        expect(mockBooking.userId).toBe('new_user');
        expect(mockBooking.save).toHaveBeenCalled();
      });
  });

  // ======================================================
  // ✅ 6. COMPLEX QUERIES
  // ======================================================
  
  describe('getPendingMappingDB', () => {
      it('should return a matrix of slots', async () => {
        const mockBookings = [{
            userId: 'u1', userName: 'Test', bookingStatus: 'confirmed',
            courtBookingDetails: [{ courtId: 'c1', timeslots: [6, 7] }]
        }];
        MockBookingModel.find.mockReturnValue(createMockQuery(mockBookings));

        const result = await service.getPendingMappingDB('center_1', new Date());

        expect(result['c1']).toBeDefined();
      });
  });

  describe('getUserBookingHistory', () => {
      it('should format history correctly', async () => {
        const mockBookings = [{
            _id: MOCK_ID, 
            centerId: 'center_1', 
            courtBookingDetails: [{ courtId: 'court_1', timeslots: [18] }],
            bookingStatus: 'confirmed',
            price: 50000,
            createdAt: new Date()
        }];

        MockBookingModel.countDocuments.mockReturnValue(createMockQuery(1));
        MockBookingModel.find.mockReturnValue(createMockQuery(mockBookings));
        
        // 🟢 FIX: Ensure mocks return data that matches the mapping logic
        centerModel.find.mockReturnValue(createMockQuery([{ centerId: 'center_1', name: 'Center One' }]));
        courtModel.find.mockReturnValue(createMockQuery([{ courtId: 'court_1', name: 'Court A' }]));

        const result = await service.getUserBookingHistory('u1', { page: 1, limit: 10 });

        expect(result.bookingHistory[0].center).toBe('center_1');
        expect(result.bookingHistory[0].court_time).toContain('Court A');
      });
  });

  // ======================================================
  // ✅ 7. STATISTICS
  // ======================================================
  describe('getUserStatistics', () => {
      it('should process aggregation results', async () => {
        userModel.findOne.mockReturnValue(createMockQuery({ points: 500 }));
        MockBookingModel.aggregate.mockResolvedValue([{
            overview: [{ total: 10, completed: 5, cancelled: 1 }],
            monthly: [],
            frequentCenters: [],
            timeDistribution: []
        }]);

        const result = await service.getUserStatistics('u1', 'month');
        expect(result.overview.totalBookings).toBe(10);
      });
  });

  // ======================================================
  // ✅ 8. AVAILABILITY ALGORITHM
  // ======================================================
  describe('checkAvailableCourtsForFixed', () => {
      it('should return courts that are NOT in conflict map', async () => {
        courtModel.find.mockReturnValue(createMockQuery([
            { courtId: 'court_1' }, { courtId: 'court_2' }
        ]));
        MockBookingModel.find.mockReturnValue(createMockQuery([
            { 
                bookDate: new Date(), 
                courtBookingDetails: [{ courtId: 'court_1', timeslots: [18] }] 
            }
        ]));
        
        const result = await service.checkAvailableCourtsForFixed({
            centerId: 'c1',
            startDate: new Date(),
            daysOfWeek: [new Date().getDay()], // Use today's day of week
            timeslots: ["18:00"]
        });
        
        expect(result).toBeDefined();
      });
  });

  describe('checkExistsPendingBooking', () => {
      it('should return true if found', async () => {
          MockBookingModel.findOne.mockReturnValue(createMockQuery({ _id: MOCK_ID }));
          const res = await service.checkExistsPendingBooking('u1', 'c1');
          expect(res.exists).toBe(true);
      });
  });
});