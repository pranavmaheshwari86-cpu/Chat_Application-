import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Community, CommunitySchema } from './schemas/community.schema';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import {
  CommunityMember,
  CommunityMemberSchema,
} from './schemas/community-member.schema';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Community.name, schema: CommunitySchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: CommunityMember.name, schema: CommunityMemberSchema },
    ]),
  ],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
