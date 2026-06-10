import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { CursorPaginationParams, PaginatedResult } from '@chat/shared';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../../common/utils/pagination.util';
import { APP_CONSTANTS } from '../../common/constants/app.constants';
import { NotificationGateway } from '../../gateway/notification.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private notificationGateway: NotificationGateway,
  ) {}

  async getUserNotifications(
    userId: string,
    paginationDto: CursorPaginationParams,
  ): Promise<PaginatedResult<NotificationDocument>> {
    const limit = paginationDto.limit || APP_CONSTANTS.PAGINATION_DEFAULT_LIMIT;
    const baseQuery = { userId: new Types.ObjectId(userId) };

    const filter = buildCursorQuery(paginationDto, baseQuery);

    const notifications = await this.notificationModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    return buildPaginatedResponse(notifications, limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );
    return { success: true };
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    payload?: any;
  }) {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(data.userId),
      type: data.type,
      title: data.title,
      body: data.body,

      data: data.payload,
    });

    await notification.save();

    // Send via socket
    this.notificationGateway.sendNotificationToUser(data.userId, notification);

    return notification;
  }
}
