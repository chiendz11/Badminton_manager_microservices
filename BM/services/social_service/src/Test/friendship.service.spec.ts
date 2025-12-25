import { Test, TestingModule } from '@nestjs/testing';
import { FriendshipService, FriendshipFilterType } from '../Service/friendship.service';
import { getModelToken } from '@nestjs/mongoose';
import { Friendship, FriendshipStatus } from '../Schema/friendship.schema';
import { User } from '../Schema/user.schema';
import { HttpService } from '@nestjs/axios';
import { ConversationService } from '../Service/conversation.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';

// --- 1. Helper Mock Query Factory ---
// Tạo mới object query cho mỗi lần gọi để tránh bị ghi đè dữ liệu (Fix lỗi undefined)
const createMockQuery = (returnValue: any) => ({
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(returnValue),
  // Giúp object này có thể 'await' được ngay lập tức (Thenable)
  then: (resolve: any) => resolve(returnValue), 
});

// --- 2. Mock Classes ---

class MockFriendshipModel {
  save: any;
  constructor(private data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this.data);
  }
  static find = jest.fn();
  static findOne = jest.fn();
  static findOneAndUpdate = jest.fn();
  static findOneAndDelete = jest.fn();
}

class MockUserModel {
  static findOne = jest.fn();
  static find = jest.fn();
}

const mockHttpService = {
  get: jest.fn(),
};

const mockConversationService = {};

const mockAmqpConnection = {
  publish: jest.fn(),
};

describe('FriendshipService', () => {
  let service: FriendshipService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset default behavior
    MockFriendshipModel.find.mockReturnValue(createMockQuery([]));
    MockUserModel.find.mockReturnValue(createMockQuery([]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipService,
        { provide: getModelToken(Friendship.name), useValue: MockFriendshipModel },
        { provide: getModelToken(User.name), useValue: MockUserModel },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConversationService, useValue: mockConversationService },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
      ],
    }).compile();

    service = module.get<FriendshipService>(FriendshipService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- TEST CASES ---

  describe('createFriendship', () => {
    it('should create friendship and send notification', async () => {
      const requesterId = 'user_1';
      const addresseeId = 'user_2';
      
      MockUserModel.findOne.mockReturnValue(createMockQuery({ name: 'Sender Name' }));

      const result = await service.createFriendship(requesterId, addresseeId);

      expect(result).toEqual(expect.objectContaining({ requesterId, addresseeId }));
      
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'notification_exchange',
        'create_notification',
        expect.objectContaining({
            userId: addresseeId,
            notiType: 'FRIEND_REQUEST',
            notiMessage: expect.stringContaining('Sender Name')
        })
      );
    });
  });

  describe('acceptFriendRequest', () => {
    it('should update status to ACCEPTED and notify requester', async () => {
      const userId = 'user_receiver';
      const friendId = 'user_requester';

      const mockUpdatedDoc = { requesterId: friendId, addresseeId: userId, status: FriendshipStatus.ACCEPTED };
      MockFriendshipModel.findOneAndUpdate.mockReturnValue(createMockQuery(mockUpdatedDoc));

      MockUserModel.findOne.mockReturnValue(createMockQuery({ name: 'Accepter Name' }));

      const result = await service.acceptFriendRequest(userId, friendId);

      // FIX: Cập nhật expect match chính xác cấu trúc $and của service
      expect(MockFriendshipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { $and: [{ requesterId: friendId }, { addresseeId: userId }] }, 
        expect.objectContaining({ $set: { status: FriendshipStatus.ACCEPTED } }),
        expect.any(Object)
      );

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'notification_exchange',
        'create_notification',
        expect.objectContaining({
            userId: friendId,
            notiType: 'FRIEND_ACCEPT'
        })
      );
      expect(result).toEqual(mockUpdatedDoc);
    });

    it('should throw NotFoundException if friendship request not found', async () => {
        MockFriendshipModel.findOneAndUpdate.mockReturnValue(createMockQuery(null));

        await expect(service.acceptFriendRequest('u1', 'u2'))
            .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFriend', () => {
    it('should delete friendship either way', async () => {
      MockFriendshipModel.findOneAndDelete.mockReturnValue(createMockQuery({}));

      await service.deleteFriend('u1', 'u2');
      
      expect(MockFriendshipModel.findOneAndDelete).toHaveBeenCalledWith({
          $or: [
              { requesterId: 'u1', addresseeId: 'u2' },
              { requesterId: 'u2', addresseeId: 'u1' } 
          ]
      });
    });
  });

  describe('getPendingRequests', () => {
    it('should return details of users who sent requests', async () => {
      const myId = 'me';
      
      // 1. Mock Requests: Dùng createMockQuery tạo instance riêng
      const mockRequests = [
          { requesterId: 'user_A', addresseeId: myId },
          { requesterId: 'user_B', addresseeId: myId }
      ];
      MockFriendshipModel.find.mockReturnValue(createMockQuery(mockRequests));

      // 2. Mock Users: Dùng createMockQuery tạo instance riêng (Không bị ghi đè nữa)
      const mockUsers = [
          { userId: 'user_A', name: 'A' },
          { userId: 'user_B', name: 'B' }
      ];
      MockUserModel.find.mockReturnValue(createMockQuery(mockUsers));

      const result = await service.getPendingRequests(myId);

      // Verify Friendship Query
      expect(MockFriendshipModel.find).toHaveBeenCalledWith({
          addresseeId: myId,
          status: FriendshipStatus.REQUESTED
      });

      // Verify User Query (Lúc này $in sẽ đúng vì mockRequests đã trả về đúng data)
      expect(MockUserModel.find).toHaveBeenCalledWith({
          userId: { $in: ['user_A', 'user_B'] }
      });

      expect(result).toEqual(mockUsers);
    });
  });

  describe('getUserFriends', () => {
    it('should return list of accepted friends', async () => {
      const myId = 'me';
      
      const mockFriendships = [
          { requesterId: myId, addresseeId: 'user_A', status: FriendshipStatus.ACCEPTED },
          { requesterId: 'user_B', addresseeId: myId, status: FriendshipStatus.ACCEPTED },
      ];
      MockFriendshipModel.find.mockReturnValue(createMockQuery(mockFriendships));

      const mockUserDetails = [{ userId: 'user_A' }, { userId: 'user_B' }];
      MockUserModel.find.mockReturnValue(createMockQuery(mockUserDetails));

      const result = await service.getUserFriends(myId);

      expect(MockUserModel.find).toHaveBeenCalledWith({
          userId: { $in: ['user_A', 'user_B'] }
      });
      expect(result).toEqual(mockUserDetails);
    });
  });

  describe('getMeiliSearchResultFilteredByFriendshipStatus', () => {
    it('should merge API results with local friendship status', async () => {
      const myId = 'me';
      const keyword = 'test';

      // Mock API
      const apiUsers = [
          { userId: 'user_friend', name: 'Friend' }, 
          { userId: 'user_requested', name: 'Req' },    
          { userId: 'user_stranger', name: 'Stranger' }, 
          { userId: 'me', name: 'Myself' } 
      ];
      mockHttpService.get.mockReturnValue(of({ data: { data: apiUsers } }));

      // Mock DB Friendships
      const mockDBFriendships = [
          { requesterId: myId, addresseeId: 'user_friend', status: FriendshipStatus.ACCEPTED },
          { requesterId: myId, addresseeId: 'user_requested', status: FriendshipStatus.REQUESTED },
      ];
      MockFriendshipModel.find.mockReturnValue(createMockQuery(mockDBFriendships));

      const result = await service.getMeiliSearchResultFilteredByFriendshipStatus(myId, keyword);

      expect(mockHttpService.get).toHaveBeenCalledWith(expect.stringContaining(keyword));
      
      expect(result).toHaveLength(3); 
      
      const friendUser = result.find(u => u.userId === 'user_friend');
      expect(friendUser.friendStatus).toBe(FriendshipFilterType.FRIENDS);

      const reqUser = result.find(u => u.userId === 'user_requested');
      expect(reqUser.friendStatus).toBe(FriendshipFilterType.REQUESTED);

      const strangerUser = result.find(u => u.userId === 'user_stranger');
      expect(strangerUser.friendStatus).toBe(FriendshipFilterType.NOT_FRIEND);
    });
  });
});