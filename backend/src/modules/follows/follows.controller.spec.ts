import { Test, TestingModule } from '@nestjs/testing';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

describe('FollowsController', () => {
  let controller: FollowsController;
  let service: FollowsService;

  const mockFollowsService = {
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    checkFollowStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowsController],
      providers: [
        {
          provide: FollowsService,
          useValue: mockFollowsService,
        },
      ],
    }).compile();

    controller = module.get<FollowsController>(FollowsController);
    service = module.get<FollowsService>(FollowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('follow', () => {
    it('should call followsService.followUser', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockFollowsService.followUser.mockResolvedValueOnce({ success: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.follow(mockReq, 'target456');

      expect(service.followUser).toHaveBeenCalledWith('user123', 'target456');
      expect(result).toEqual({ success: true });
    });
  });

  describe('unfollow', () => {
    it('should call followsService.unfollowUser', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockFollowsService.unfollowUser.mockResolvedValueOnce({ success: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.unfollow(mockReq, 'target456');

      expect(service.unfollowUser).toHaveBeenCalledWith('user123', 'target456');
      expect(result).toEqual({ success: true });
    });
  });

  describe('checkStatus', () => {
    it('should call followsService.checkFollowStatus', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockFollowsService.checkFollowStatus.mockResolvedValueOnce({
        isFollowing: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.checkStatus(mockReq, 'target456');

      expect(service.checkFollowStatus).toHaveBeenCalledWith(
        'user123',
        'target456',
      );
      expect(result).toEqual({ isFollowing: true });
    });
  });
});
