import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Conversation,
  ConversationDocument,
} from '../conversations/schemas/conversation.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async getDashboardStats() {
    const totalUsers = await this.userModel.countDocuments();
    const totalConversations = await this.conversationModel.countDocuments();
    const totalMessages = await this.messageModel.countDocuments();
    const flaggedMessages = await this.messageModel.countDocuments({
      isFlagged: true,
    });

    // recent users
    const recentUsers = await this.userModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('displayName username email role createdAt');

    return {
      stats: {
        totalUsers,
        totalConversations,
        totalMessages,
        flaggedMessages,
      },
      recentUsers,
    };
  }

  async setRole(userId: string, role: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { role }, { new: true })
      .select('-passwordHash');
  }

  async blockUser(userId: string) {
    // In a real app, we might add an 'isBanned' or 'isActive' flag to user.
    // For now we can add an isBanned field or just use status.
    return this.userModel.findByIdAndUpdate(
      userId,
      { status: 'offline' },
      { new: true },
    );
  }
}
