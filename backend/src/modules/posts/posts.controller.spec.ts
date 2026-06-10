import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;
  let service: PostsService;

  const mockPostsService = {
    create: jest.fn(),
    getUserPosts: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('likePost', () => {
    it('should call postsService.likePost', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockPostsService.likePost.mockResolvedValueOnce(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await controller.likePost(mockReq, 'post123');

      expect(service.likePost).toHaveBeenCalledWith('user123', 'post123');
    });
  });
});
