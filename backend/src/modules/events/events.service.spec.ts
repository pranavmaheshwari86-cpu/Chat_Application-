import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventsService } from './events.service';
import { EventName } from './types/events.types';

describe('EventsService', () => {
  let service: EventsService;

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getQueueToken('flashchat-events'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emitUserOnline', () => {
    it('should add job to queue', async () => {
      await service.emitUserOnline('user1');
      expect(mockQueue.add).toHaveBeenCalled();
      const callArgs = mockQueue.add.mock.calls[0];
      expect(callArgs[0]).toBe(EventName.USER_ONLINE);
      expect(callArgs[1]).toEqual(expect.objectContaining({ userId: 'user1' }));
      const payload = callArgs[1];
      expect(payload).toHaveProperty('eventId');
      expect(payload).toHaveProperty('timestamp');
      expect(typeof payload.eventId).toBe('string');
      expect(typeof payload.timestamp).toBe('string');
    });
  });
});
