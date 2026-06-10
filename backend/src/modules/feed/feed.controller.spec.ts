import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

describe('FeedController', () => {
  let controller: FeedController;
  let service: FeedService;

  const mockFeedService = {
    getFeed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        {
          provide: FeedService,
          useValue: mockFeedService,
        },
      ],
    }).compile();

    controller = module.get<FeedController>(FeedController);
    service = module.get<FeedService>(FeedService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeed', () => {
    it('should call feedService.getFeed', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockFeedService.getFeed.mockResolvedValueOnce([]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.getFeed(mockReq, '5', '10');

      expect(service.getFeed).toHaveBeenCalledWith('user123', 5, 10);
      expect(result).toEqual([]);
    });

    it('should use default pagination', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockFeedService.getFeed.mockResolvedValueOnce([]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await controller.getFeed(mockReq);

      expect(service.getFeed).toHaveBeenCalledWith('user123', 10, 0);
    });
  });
});
