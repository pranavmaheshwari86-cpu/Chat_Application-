import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PostsService } from './posts.service';
import { Post } from './schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;

  const mockPost = {
    _id: new Types.ObjectId(),
    content: 'Test content',
    author: new Types.ObjectId(),
    likes: [],
    likesCount: 0,
    save: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
  };

  const mockPostModel = {
    new: jest.fn().mockReturnValue(mockPost),
    constructor: jest.fn().mockReturnValue(mockPost),
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new post', async () => {
      // Mock for new postModel()
    });
  });

  describe('getPostById', () => {
    it('should return a post if found', async () => {
      mockPostModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPost),
      });

      const result = await service.getPostById('someId');
      expect(result).toEqual(mockPost);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPostModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPostById('someId')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('likePost', () => {
    it('should like a post and increment count', async () => {
      const post = {
        ...mockPost,
        likes: [],
        likesCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      mockPostModel.findById.mockResolvedValue(post);

      const result = await service.likePost(
        new Types.ObjectId().toHexString(),
        'postId',
      );
      expect(post.likes.length).toBe(1);
      expect(post.likesCount).toBe(1);
      expect(post.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
