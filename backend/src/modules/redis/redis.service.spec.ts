import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Mock ioredis constructor
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      sismember: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue(['user1', 'user2']),
    };
  });
});

describe('RedisService', () => {
  let service: RedisService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('presence', () => {
    it('should add online user', async () => {
      const result = await service.addOnlineUser('user1');
      expect(result).toEqual({
        success: true,
        data: true,
        redisAvailable: true,
      });
    });

    it('should remove online user', async () => {
      const result = await service.removeOnlineUser('user1');
      expect(result).toEqual({
        success: true,
        data: true,
        redisAvailable: true,
      });
    });

    it('should check if user is online', async () => {
      const result = await service.isUserOnline('user1');
      expect(result).toEqual({
        success: true,
        data: true,
        redisAvailable: true,
      });
    });

    it('should get online users', async () => {
      const result = await service.getOnlineUsers();
      expect(result).toEqual({
        success: true,
        data: ['user1', 'user2'],
        redisAvailable: true,
      });
    });
  });
});
