import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    getCommentsByPost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call commentsService.create', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      const content = 'test comment';

      mockCommentsService.create.mockResolvedValueOnce({
        id: 'comment1',
        content,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.create(mockReq, 'post123', content);

      expect(service.create).toHaveBeenCalledWith(
        'user123',
        'post123',
        content,
      );
      expect(result).toEqual({ id: 'comment1', content });
    });
  });

  describe('getComments', () => {
    it('should call commentsService.getCommentsByPost with correct params', async () => {
      mockCommentsService.getCommentsByPost.mockResolvedValueOnce([]);
      await controller.getComments('post123', '5', '10');

      expect(service.getCommentsByPost).toHaveBeenCalledWith('post123', 5, 10);
    });

    it('should use default pagination params', async () => {
      mockCommentsService.getCommentsByPost.mockResolvedValueOnce([]);
      await controller.getComments('post123');

      expect(service.getCommentsByPost).toHaveBeenCalledWith('post123', 20, 0);
    });
  });
});
