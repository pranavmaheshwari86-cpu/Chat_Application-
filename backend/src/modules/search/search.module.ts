import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  Community,
  CommunitySchema,
} from '../communities/schemas/community.schema';
import {
  KnowledgeDocument,
  KnowledgeDocumentSchema,
} from '../knowledge/schemas/knowledge-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Community.name, schema: CommunitySchema },
      { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
