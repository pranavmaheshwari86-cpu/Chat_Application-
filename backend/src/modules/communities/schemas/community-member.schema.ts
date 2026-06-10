import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityMemberDocument = CommunityMember & Document;

@Schema({ timestamps: true })
export class CommunityMember {
  @Prop({ type: Types.ObjectId, ref: 'Community', required: true, index: true })
  communityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop([{ type: Types.ObjectId }]) // references role _ids in Community.roles
  roleIds: Types.ObjectId[];

  @Prop({ type: Date })
  joinedAt: Date;
}

export const CommunityMemberSchema =
  SchemaFactory.createForClass(CommunityMember);
CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
