import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { RedisService } from '../modules/redis/redis.service';
import { MessagesService } from '../modules/messages/messages.service';
import { ConversationsService } from '../modules/conversations/conversations.service';
import { User } from '../modules/users/schemas/user.schema';
import { ThrottlerModule } from '@nestjs/throttler';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRedisService = {
    addOnlineUser: jest.fn(),
    removeOnlineUser: jest.fn(),
    isUserOnline: jest.fn(),
  };

  const mockMessagesService = {
    markAsRead: jest.fn(),
  };

  const mockConversationsService = {
    getConversation: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockResolvedValue({ isBanned: false }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleJoinConversation', () => {
    it('should reject join attempt if user is not a member of conversation (IDOR prevention)', async () => {
      // Simulate IDOR attack
      mockConversationsService.getConversation.mockRejectedValue(
        new Error('Access denied'),
      );

      const mockClient = {
        id: 'socket123',
        user: { userId: 'attackerId' },
        join: jest.fn(),
      } as any;

      const result = await gateway.handleJoinConversation(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        mockClient,
        'targetConversationId',
      );

      expect(result).toEqual({ success: false, error: 'Access denied' });
      expect(mockConversationsService.getConversation).toHaveBeenCalledWith(
        'targetConversationId',
        'attackerId',
      );

      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should allow join if user is a member', async () => {
      mockConversationsService.getConversation.mockResolvedValue({
        _id: 'targetConversationId',
      });

      const mockClient = {
        id: 'socket123',
        user: { userId: 'validUser' },
        join: jest.fn(),
      } as any;

      const result = await gateway.handleJoinConversation(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        mockClient,
        'targetConversationId',
      );

      expect(result).toEqual({
        success: true,
        conversationId: 'targetConversationId',
      });
      expect(mockConversationsService.getConversation).toHaveBeenCalledWith(
        'targetConversationId',
        'validUser',
      );

      expect(mockClient.join).toHaveBeenCalledWith(
        'conversation:targetConversationId',
      );
    });
  });
});
