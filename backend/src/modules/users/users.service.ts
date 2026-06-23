import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Fields that must never be returned to clients. */
const SENSITIVE_FIELDS =
  '-passwordHash -refreshTokenHash -passwordResetToken -passwordResetExpires';

/** Fields allowed for public profiles (excludes email, roles, settings, etc). */
const PUBLIC_FIELDS =
  'username displayName avatar bio accountType headline skills portfolio socialLinks trustScore badges interests location followersCount followingCount status lastSeen isVerified createdAt';

/** Fields the PATCH /users/me endpoint is allowed to write. */
const UPDATABLE_FIELDS: (keyof UpdateProfileDto)[] = [
  'displayName',
  'bio',
  'headline',
  'avatar',
  'accountType',
  'skills',
  'portfolio',
  'socialLinks',
  'interests',
  'location',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Return the full public profile for a user (no sensitive hashes).
   */
  async getFullProfile(userId: string): Promise<Record<string, any>> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(userId)
      .select(SENSITIVE_FIELDS)
      .lean<Record<string, any>>()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Return a limited public profile for a user.
   */
  async getPublicProfile(userId: string): Promise<Record<string, any>> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(userId)
      .select(PUBLIC_FIELDS)
      .lean<Record<string, any>>()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update whitelisted profile fields for a given user.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Record<string, any>> {
    const sanitised: Record<string, any> = {};

    for (const key of UPDATABLE_FIELDS) {
      if (dto[key] !== undefined) {
        sanitised[key] = dto[key];
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: sanitised },
        { new: true, runValidators: true },
      )
      .select(SENSITIVE_FIELDS)
      .lean<Record<string, any>>()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Adjust trustScore by `delta`, clamping to [0, 100].
   */
  async updateTrustScore(userId: string, delta: number): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.trustScore = Math.min(
      100,
      Math.max(0, (user.trustScore ?? 50) + delta),
    );
    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    delete result.refreshTokenHash;
    delete result.passwordResetToken;
    delete result.passwordResetExpires;

    return result as UserDocument;
  }

  /**
   * Push a new badge onto the user's badges array.
   */
  async awardBadge(
    userId: string,
    badge: { type: string; label: string; awardedAt?: Date },
  ): Promise<Record<string, any>> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $push: {
            badges: {
              type: badge.type,
              label: badge.label,
              awardedAt: badge.awardedAt ?? new Date(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .select(SENSITIVE_FIELDS)
      .lean<Record<string, any>>()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Full-text search across username and displayName.
   * Uses the text index already defined on the schema.
   */
  async searchUsers(query: string, limit = 20): Promise<Record<string, any>[]> {
    if (!query || !query.trim()) {
      return [];
    }

    return this.userModel
      .find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(Math.min(limit, 50))
      .select(PUBLIC_FIELDS)
      .lean<Record<string, any>[]>()
      .exec();
  }

  /**
   * Find a single user by ID (used by other modules).
   */
  async findById(userId: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.userModel.findById(userId).exec();
  }

  /**
   * Find a single user by ID and return as plain object (no Mongoose document).
   */
  async findByIdLean(userId: string): Promise<Record<string, any> | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.userModel
      .findById(userId)
      .select(SENSITIVE_FIELDS)
      .lean<Record<string, any>>()
      .exec();
  }
}
