import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChannelDocument = Channel & Document;

@Schema({ timestamps: true })
export class Channel {
  @Prop({ type: Types.ObjectId, ref: 'Community', required: true })
  communityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  topic?: string;

  @Prop({
    type: String,
    enum: ['text', 'voice', 'announcement', 'forum', 'thread'],
    default: 'text',
  })
  type: string;

  // For Threads
  @Prop({ type: Types.ObjectId, ref: 'Channel' })
  parentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  messageId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isPrivate: boolean;

  // Role IDs allowed if private
  @Prop([{ type: Types.ObjectId }])
  allowedRoleIds?: Types.ObjectId[];
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
ChannelSchema.index({ communityId: 1 });
