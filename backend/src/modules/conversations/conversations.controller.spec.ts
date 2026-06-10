import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let service: ConversationsService;

  const mockConversationsService = {
    getUserConversations: jest.fn(),
    createDirectConversation: jest.fn(),
    createGroup: jest.fn(),
    getConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
    service = module.get<ConversationsService>(ConversationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserConversations', () => {
    it('should call conversationsService.getUserConversations', async () => {
      const mockReq = { userId: 'user123' } as any;
      mockConversationsService.getUserConversations.mockResolvedValueOnce([]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.getUserConversations(mockReq, '5', 10);

      expect(service.getUserConversations).toHaveBeenCalledWith('user123', {
        cursor: '5',
        limit: 10,
      });
      expect(result).toEqual([]);
    });
  });
});
