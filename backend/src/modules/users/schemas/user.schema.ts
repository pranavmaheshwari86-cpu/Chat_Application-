import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ default: 0 })
  tokenVersion: number;
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  })
  username: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  displayName: string;

  @Prop({ default: null, select: false })
  passwordHash?: string;

  @Prop()
  avatar?: string;

  @Prop({ maxlength: 200 })
  bio?: string;

  @Prop({
    type: String,
    enum: ['personal', 'creator', 'business', 'org'],
    default: 'personal',
  })
  accountType: string;

  @Prop({ maxlength: 120 })
  headline?: string;

  @Prop({
    type: [String],
    default: [],
    validate: [
      (val: string[]) => val.length <= 20,
      'Skills cannot exceed 20 items',
    ],
  })
  skills: string[];

  @Prop({
    type: [
      raw({
        title: { type: String, required: true },
        url: { type: String, required: true },
        thumbnail: { type: String },
      }),
    ],
    default: [],
  })
  portfolio: Record<string, any>[];

  @Prop(
    raw({
      website: { type: String },
      twitter: { type: String },
      github: { type: String },
      linkedin: { type: String },
    }),
  )
  socialLinks?: Record<string, any>;

  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  trustScore: number;

  @Prop({
    type: [
      raw({
        type: { type: String, required: true },
        label: { type: String, required: true },
        awardedAt: { type: Date, default: Date.now },
      }),
    ],
    default: [],
  })
  badges: Record<string, any>[];

  @Prop({ type: [String], default: [] })
  interests: string[];

  @Prop()
  location?: string;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ type: String, enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ type: String, enum: ['local', 'google'], default: 'local' })
  provider: string;

  @Prop()
  providerId?: string;

  @Prop({
    type: String,
    enum: ['online', 'offline', 'away', 'dnd'],
    default: 'offline',
  })
  status: string;

  @Prop({ default: Date.now })
  lastSeen: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isBanned: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  blockedUsers: Types.ObjectId[];

  @Prop({
    type: {
      notifications: {
        sound: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
      },
      privacy: {
        showLastSeen: { type: Boolean, default: true },
        showReadReceipts: { type: Boolean, default: true },
        showOnlineStatus: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'system',
      },
    },
    default: {
      notifications: { sound: true, desktop: true, mentions: true },
      privacy: {
        showLastSeen: true,
        showReadReceipts: true,
        showOnlineStatus: true,
      },
      theme: 'system',
    },
  })
  settings: Record<string, any>;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ username: 'text', displayName: 'text' });
UserSchema.index({ provider: 1, providerId: 1 }, { sparse: true });
UserSchema.index({ blockedUsers: 1 });
