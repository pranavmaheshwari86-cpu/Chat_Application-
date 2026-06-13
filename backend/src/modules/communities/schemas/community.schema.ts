import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityDocument = Community & Document;

@Schema({ timestamps: true })
export class Community {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  // Settings
  @Prop({
    type: {
      isPrivate: { type: Boolean, default: false },
      allowInvites: { type: Boolean, default: true },
    },
    default: { isPrivate: false, allowInvites: true },
  })
  settings: {
    isPrivate: boolean;
    allowInvites: boolean;
  };

  // Roles Definition
  @Prop([
    {
      name: { type: String, required: true },
      permissions: [{ type: String }],
      color: { type: String, default: '#99aab5' },
      isDefault: { type: Boolean, default: false },
    },
  ])
  roles: Array<{
    name: string;
    permissions: string[];
    color: string;
    isDefault: boolean;
  }>;
}

export const CommunitySchema = SchemaFactory.createForClass(Community);
CommunitySchema.index({ name: 'text', description: 'text' });
CommunitySchema.index({ ownerId: 1 });
