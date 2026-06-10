import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { Comment } from './schemas/comment.schema';
import { Post } from '../posts/schemas/post.schema';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentModel = {
    new: jest.fn().mockReturnValue({
      save: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    }),
    constructor: jest.fn().mockReturnValue({
      save: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    }),
  };

  const mockPostModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getModelToken(Comment.name),
          useValue: mockCommentModel,
        },
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if post not found', async () => {
      mockPostModel.findById.mockResolvedValueOnce(null);

      await expect(
        service.create(
          new Types.ObjectId().toHexString(),
          new Types.ObjectId().toHexString(),
          'test',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
