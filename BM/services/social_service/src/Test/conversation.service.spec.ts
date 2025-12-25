import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from '../Service/conversation.service';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation, ConversationType } from '../Schema/conversation.schema';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Friendship } from '../Schema/friendship.schema';

const mockExec = jest.fn();

const mockQuery = {
  exec: mockExec,
};

class MockConversationModel {
  constructor(private data: any) {
    Object.assign(this, data);
  }
  save = jest.fn().mockResolvedValue(this);

  static findOne = jest.fn().mockReturnValue(mockQuery);
  static aggregate = jest.fn().mockReturnValue(mockQuery);
}

describe('ConversationService', () => {
  let service: ConversationService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: getModelToken(Conversation.name),
          useValue: MockConversationModel,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initConversation', () => {
    const mockFriendship = {
      requesterId: 'user1',
      addresseeId: 'user2',
      toString: () => 'friendshipId',
    } as unknown as Friendship;

    it('should return existing conversation if found', async () => {
      const existingConv = { _id: 'conv1', memberIds: ['user1', 'user2'] };
      mockExec.mockResolvedValue(existingConv);

      const result = await service.initConversation(mockFriendship);

      expect(MockConversationModel.findOne).toHaveBeenCalledWith({
        memberIds: {
          $all: ['user1', 'user2'],
          $size: 2,
        },
      });
      expect(result).toEqual(existingConv);
    });

    it('should create new conversation if not found', async () => {
      mockExec.mockResolvedValue(null); 

      const result: any = await service.initConversation(mockFriendship);

      expect(MockConversationModel.findOne).toHaveBeenCalled();
      expect(result).toMatchObject({
        memberIds: ['user1', 'user2'],
      });
      expect(result.save).toHaveBeenCalled();
    });
  });

  describe('getConversation', () => {
    it('should return conversation details if found', async () => {
      const mockResult = [
        {
          _id: 'conv_1',
          type: ConversationType.PRIVATE,
          memberDetails: [{ userId: 'user1' }],
          messages: []
        }
      ];
      mockExec.mockResolvedValue(mockResult);

      const result = await service.getConversation('user1', 'user2');

      expect(MockConversationModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: {
              memberIds: { $all: ['user1', 'user2'], $size: 2 },
              type: ConversationType.PRIVATE
            }
          })
        ])
      );
      expect(result).toEqual(mockResult[0]);
    });

    it('should return null if no conversation found', async () => {
      mockExec.mockResolvedValue([]); 

      const result = await service.getConversation('user1', 'user2');

      expect(result).toBeNull();
    });
  });

  describe('getAllConversations', () => {
    it('should return list of conversations', async () => {
      const mockResults = [
        { _id: 'c1', memberDetails: [] },
        { _id: 'c2', memberDetails: [] }
      ];
      mockExec.mockResolvedValue(mockResults);

      const result = await service.getAllConversations('user1');

      expect(MockConversationModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: { memberIds: 'user1' }
          }),
          expect.objectContaining({
            $sort: { updatedAt: -1 }
          })
        ])
      );
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockResults);
    });
  });
});