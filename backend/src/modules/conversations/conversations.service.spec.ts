import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { Conversation } from './schemas/conversation.schema';
import { Types } from 'mongoose';

class MockConversationModel {
  constructor(public data: any) {}
  save = jest.fn().mockResolvedValue(this);
  static findOne = jest.fn();
  static find = jest.fn();
}

describe('ConversationsService', () => {
  let service: ConversationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: MockConversationModel,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGroup', () => {
    it('should create a group conversation', async () => {
      const validId1 = new Types.ObjectId().toHexString();
      const validId2 = new Types.ObjectId().toHexString();

      const result = await service.createGroup(validId1, {
        name: 'Group',
        participantIds: [validId2],
      } as unknown as import('./dto/create-group.dto').CreateGroupDto);
      expect(result).toBeDefined();
    });
  });
});
