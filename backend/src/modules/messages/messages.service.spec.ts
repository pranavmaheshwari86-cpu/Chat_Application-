import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { Message } from './schemas/message.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { ChatGateway } from '../../gateway/chat.gateway';
import { Types } from 'mongoose';

import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockMessage = {
    _id: new Types.ObjectId(),
    content: 'Test msg',
    sender: new Types.ObjectId(),
    conversationId: new Types.ObjectId(),
    save: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
  };

  const mockMessageModel = {
    new: jest.fn().mockReturnValue(mockMessage),
    constructor: jest.fn().mockReturnValue(mockMessage),
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockConversationModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockChatGateway = {
    setMessagesService: jest.fn(),
    server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMessages', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      mockConversationModel.findById.mockResolvedValueOnce(null);

      await expect(
        service.getMessages(
          new Types.ObjectId().toHexString(),
          new Types.ObjectId().toHexString(),
          {
            limit: 10,
            skip: 0,
          } as unknown as import('./dto/message-query.dto').MessageQueryDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
