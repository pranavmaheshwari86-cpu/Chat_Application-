import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    getFullProfile: jest.fn(),
    findById: jest.fn(),
    findByUsername: jest.fn(),
    searchUsers: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should call usersService.getFullProfile', async () => {
      const mockReq = { user: { userId: 'user123' } } as any;
      mockUsersService.getFullProfile.mockResolvedValueOnce({
        id: 'user123',
        username: 'test',
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.getMe(mockReq);

      expect(service.getFullProfile).toHaveBeenCalledWith('user123');
      expect(result).toEqual({ id: 'user123', username: 'test' });
    });
  });

  describe('searchUsers', () => {
    it('should call usersService.searchUsers', async () => {
      mockUsersService.searchUsers.mockResolvedValueOnce([]);

      const result = await controller.searchUsers('test', '5');

      expect(service.searchUsers).toHaveBeenCalledWith('test', 5);
      expect(result).toEqual([]);
    });
  });
});
