import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export enum NotificationType {
  SHARE = 'SHARE',
  DOWNLOAD = 'DOWNLOAD',
  QUOTA_ALERT = 'QUOTA_ALERT',
  INVITATION = 'INVITATION',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  FILE_UPLOADED = 'FILE_UPLOADED',
  COMMENT = 'COMMENT',
}

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export class NotificationService {
  /**
   * Create a notification
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
        },
      });

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized access to notification');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return result.count;
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized access to notification');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all read notifications
   */
  static async deleteAllRead(userId: string) {
    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });

    return result.count;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  /**
   * Create share notification
   */
  static async notifyShare(
    recipientId: string,
    sharerName: string,
    resourceName: string,
    resourceType: 'file' | 'folder'
  ) {
    return this.createNotification({
      userId: recipientId,
      title: 'New Share',
      message: `${sharerName} shared a ${resourceType} "${resourceName}" with you`,
      type: NotificationType.SHARE,
    });
  }

  /**
   * Create download notification
   */
  static async notifyDownload(
    ownerId: string,
    downloaderName: string,
    fileName: string
  ) {
    return this.createNotification({
      userId: ownerId,
      title: 'File Downloaded',
      message: `${downloaderName} downloaded your file "${fileName}"`,
      type: NotificationType.DOWNLOAD,
    });
  }

  /**
   * Create quota alert notification
   */
  static async notifyQuotaAlert(
    userId: string,
    usagePercent: number,
    severity: 'warning' | 'critical'
  ) {
    const title = severity === 'critical' ? 'Storage Full' : 'Storage Warning';
    const message =
      severity === 'critical'
        ? `Your storage is ${usagePercent.toFixed(0)}% full. Please delete files or upgrade your plan.`
        : `Your storage is ${usagePercent.toFixed(0)}% full. Consider cleaning up files.`;

    return this.createNotification({
      userId,
      title,
      message,
      type: NotificationType.QUOTA_ALERT,
    });
  }

  /**
   * Create invitation notification
   */
  static async notifyInvitation(
    recipientId: string,
    inviterName: string,
    resourceName: string,
    resourceType: 'file' | 'folder'
  ) {
    return this.createNotification({
      userId: recipientId,
      title: 'New Invitation',
      message: `${inviterName} invited you to access a ${resourceType} "${resourceName}"`,
      type: NotificationType.INVITATION,
    });
  }
}
