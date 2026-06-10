import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FeedService } from './feed.service';
import { Post } from '../posts/schemas/post.schema';
import { Follow } from '../follows/schemas/follow.schema';
import { Types } from 'mongoose';

describe('FeedService', () => {
  let service: FeedService;

  const mockPostModel = {
    find: jest.fn(),
  };

  const mockFollowModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
        {
          provide: getModelToken(Follow.name),
          useValue: mockFollowModel,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    it('should return posts from followed users and the user themselves', async () => {
      const followingId = new Types.ObjectId();
      const userId = new Types.ObjectId().toHexString();

      mockFollowModel.find.mockResolvedValueOnce([{ following: followingId }]);

      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([{ content: 'Test post' }]),
      });

      const result = await service.getFeed(userId);
      expect(result).toHaveLength(1);
    });
  });
});
