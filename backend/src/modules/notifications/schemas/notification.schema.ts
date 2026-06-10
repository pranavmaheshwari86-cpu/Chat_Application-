import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'message',
      'mention',
      'reaction',
      'group_invite',
      'group_update',
      'system',
      'like',
      'comment',
      'follow',
    ],
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({
    type: {
      conversationId: { type: String },
      messageId: { type: String },
      senderId: { type: String },
      senderName: { type: String },
      senderAvatar: { type: String },
    },
  })
  data?: Record<string, any>;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
