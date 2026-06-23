import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'voice', 'gif', 'system'],
    default: 'text',
  })
  type: string;

  @Prop({ maxlength: 8000 })
  content?: string;

  @Prop([
    {
      url: { type: String },
      publicId: { type: String },
      type: { type: String, enum: ['image', 'video', 'audio', 'file'] },
      name: { type: String },
      size: { type: Number },
      mimeType: { type: String },
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },
      thumbnailUrl: { type: String },
    },
  ])
  attachments?: Record<string, any>[];

  @Prop({
    type: {
      _id: { type: Types.ObjectId },
      content: { type: String },
      senderId: { type: Types.ObjectId },
      senderName: { type: String },
      type: { type: String },
    },
  })
  replyTo?: Record<string, any>;

  @Prop({
    type: {
      conversationId: { type: Types.ObjectId },
      messageId: { type: Types.ObjectId },
      senderName: { type: String },
    },
  })
  forwardedFrom?: Record<string, any>;

  @Prop([
    {
      emoji: { type: String },
      userId: { type: Types.ObjectId },
      createdAt: { type: Date, default: Date.now },
    },
  ])
  reactions: Record<string, any>[];

  @Prop([
    {
      userId: { type: Types.ObjectId },
      readAt: { type: Date, default: Date.now },
    },
  ])
  readBy: Record<string, any>[];

  @Prop([
    {
      userId: { type: Types.ObjectId },
      deliveredAt: { type: Date, default: Date.now },
    },
  ])
  deliveredTo: Record<string, any>[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop()
  editedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: false })
  isFlagged: boolean;

  @Prop()
  expiresAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, _id: -1 }); // For cursor-based pagination
MessageSchema.index({ conversationId: 1, senderId: 1, 'readBy.userId': 1 });
MessageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' });
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
