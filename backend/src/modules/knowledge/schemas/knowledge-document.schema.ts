import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KnowledgeDocumentDoc = KnowledgeDocument & Document;

@Schema({ timestamps: true })
export class KnowledgeDocument {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string; // Markdown content

  @Prop({
    type: String,
    enum: [
      'note',
      'wiki',
      'decision_log',
      'meeting_notes',
      'whiteboard',
      'doc',
    ],
    default: 'note',
  })
  type: string;

  // Ownership
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  // Scoping — belongs to a community/channel, or is personal
  @Prop({ type: Types.ObjectId, ref: 'Community', index: true })
  communityId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Channel' })
  channelId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['personal', 'community', 'conversation'],
    default: 'personal',
  })
  scope: string;

  // Collaboration
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  collaboratorIds: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isPublic: boolean;

  // Tagging & Categorization
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String })
  category?: string;

  // AI-extracted metadata
  @Prop({ type: Boolean, default: false })
  isAiGenerated: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  sourceMessageId?: Types.ObjectId; // If extracted from a message

  // Versioning
  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop([
    {
      version: { type: Number },
      content: { type: String },
      editedBy: { type: Types.ObjectId, ref: 'User' },
      editedAt: { type: Date },
    },
  ])
  history: Array<{
    version: number;
    content: string;
    editedBy: Types.ObjectId;
    editedAt: Date;
  }>;

  // Status
  @Prop({
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status: string;

  // Engagement
  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop({ type: [Number], default: [] })
  embedding?: number[]; // Vector embedding for semantic search

  // Pinning
  @Prop({ type: Boolean, default: false })
  isPinned: boolean;
}

export const KnowledgeDocumentSchema =
  SchemaFactory.createForClass(KnowledgeDocument);

// Full-text search
KnowledgeDocumentSchema.index({ title: 'text', content: 'text', tags: 'text' });
// Query optimizations
KnowledgeDocumentSchema.index({ authorId: 1, scope: 1 });
KnowledgeDocumentSchema.index({ communityId: 1, type: 1 });
KnowledgeDocumentSchema.index({ communityId: 1, status: 1 });
