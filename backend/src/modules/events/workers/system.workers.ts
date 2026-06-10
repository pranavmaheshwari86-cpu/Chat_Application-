import { Injectable, Logger } from '@nestjs/common';

import type { JwtPayload } from '@chat/shared';

@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async sendPushNotification(payload: any) {
    this.logger.debug(`[NotificationWorker] Sending push notification...`);
    // TODO: Integrate Firebase Cloud Messaging (FCM) or APNS
  }
}

@Injectable()
export class AnalyticsWorker {
  private readonly logger = new Logger(AnalyticsWorker.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async trackEvent(eventName: string, payload: any) {
    this.logger.debug(`[AnalyticsWorker] Tracking event ${eventName}...`);
    // TODO: Push to Data Warehouse / Mixpanel / PostHog
  }
}

@Injectable()
export class MediaWorker {
  private readonly logger = new Logger(MediaWorker.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async processUpload(payload: any) {
    this.logger.debug(`[MediaWorker] Processing media upload...`);
    // TODO: Trigger Cloudinary transforms, generate thumbnails, compress video
  }
}
