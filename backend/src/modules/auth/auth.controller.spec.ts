import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        displayName: 'Test',
      };
      const expectedResponse = {
        user: { id: '1' } as any,
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockAuthService.register.mockResolvedValueOnce(expectedResponse);

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.register(dto, mockRes);

      expect(service.register).toHaveBeenCalledWith(dto);

      expect(mockRes.cookie).toHaveBeenCalled();
      expect(result).toEqual({
        user: expectedResponse.user,
        accessToken: expectedResponse.accessToken,
      });
    });
  });
});
