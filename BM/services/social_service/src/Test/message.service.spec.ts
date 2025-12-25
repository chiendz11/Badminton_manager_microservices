import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from '../Service/message.service';
import { getModelToken } from '@nestjs/mongoose';
import { Message } from '../Schema/message.schema';
import { Conversation } from '../Schema/conversation.schema';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';

class MockMessageModel {
  save: any;
  constructor(private data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue({
      _id: 'generated_msg_id',
      ...this.data,
    });
  }
}

const mockConversationModel = {
  findByIdAndUpdate: jest.fn(),
};

describe('MessageService', () => {
  let service: MessageService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken(Message.name),
          useValue: MockMessageModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should create message and update conversation timestamp', async () => {
      const senderId = 'user_123';
      const conversationId = '507f1f77bcf86cd799439011'; 
      const content = 'Hello World';

      mockConversationModel.findByIdAndUpdate.mockResolvedValue(true);

      const result = await service.sendMessage(senderId, conversationId, content);

      expect(result).toEqual(expect.objectContaining({
        content: content,
        senderId: senderId,
        conversationId: expect.any(Types.ObjectId)
      }));

      expect(result.conversationId.toString()).toBe(conversationId);

      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        { 
            $set: { updatedAt: expect.any(Date) } 
        }
      );
    });
  });
});