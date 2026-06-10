import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: MessagesService;

  const mockMessagesService = {
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMessages', () => {
    it('should call messagesService.getMessages', async () => {
      const mockUser = { userId: 'user123' } as unknown as Parameters<
        typeof controller.getMessages
      >[1];
      const query = { limit: 10, skip: 0 };

      mockMessagesService.getMessages.mockResolvedValueOnce({ messages: [] });

      const result = await controller.getMessages(
        'conv123',
        mockUser,
        query as unknown as Parameters<typeof controller.getMessages>[2],
      );

      expect(service.getMessages).toHaveBeenCalledWith(
        'conv123',
        'user123',
        query,
      );
      expect(result).toEqual({ messages: [] });
    });
  });
});
