import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../users/schemas/user.schema';
import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

class MockUserModel {
  constructor(public data: any) {}
  save = jest.fn().mockResolvedValue(this);
  static findOne = jest.fn();
}

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('some-config-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens if credentials are valid', async () => {
      // Mock valid user find
      MockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'userId123',
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashedPassword',
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email exists', async () => {
      MockUserModel.findOne.mockResolvedValueOnce({
        email: 'test@example.com',
      });

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username exists', async () => {
      MockUserModel.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ username: 'testuser' });

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
