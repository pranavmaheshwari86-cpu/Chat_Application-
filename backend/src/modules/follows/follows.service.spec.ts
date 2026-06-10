import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FollowsService } from './follows.service';
import { Follow } from './schemas/follow.schema';
import { User } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

import { ConflictException, BadRequestException } from '@nestjs/common';

describe('FollowsService', () => {
  let service: FollowsService;

  const mockFollowModel = {
    new: jest.fn().mockReturnValue({ save: jest.fn().mockReturnThis() }),
    constructor: jest
      .fn()
      .mockReturnValue({ save: jest.fn().mockReturnThis() }),
    findOne: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: getModelToken(Follow.name),
          useValue: mockFollowModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('followUser', () => {
    it('should throw BadRequestException if already following', async () => {
      mockUserModel.findById.mockResolvedValueOnce({});
      mockFollowModel.findOne.mockResolvedValueOnce({ _id: '123' });

      await expect(
        service.followUser(
          new Types.ObjectId().toHexString(),
          new Types.ObjectId().toHexString(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if trying to follow self', async () => {
      const id = new Types.ObjectId().toHexString();
      await expect(service.followUser(id, id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
