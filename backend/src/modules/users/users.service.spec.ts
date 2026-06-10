import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Types } from 'mongoose';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    save: jest.fn().mockReturnThis(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return null if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById(new Types.ObjectId().toHexString());
      expect(result).toBeNull();
    });

    it('should return null if invalid ObjectId', async () => {
      const result = await service.findById('invalid-id');
      expect(result).toBeNull();
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('should return user if found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findById(new Types.ObjectId().toHexString());
      expect(result).toEqual(mockUser);
    });
  });
});
