import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  Community,
  CommunitySchema,
} from '../communities/schemas/community.schema';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Community.name, schema: CommunitySchema },
    ]),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
