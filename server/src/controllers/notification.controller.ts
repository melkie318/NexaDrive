import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import {
  getNotificationsSchema,
  markAsReadSchema,
  deleteNotificationSchema,
} from '../validations/notification.validation';

export class NotificationController {
  /**
   * Get user notifications
   * GET /api/v1/notifications
   */
  static getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = getNotificationsSchema.parse(req.query);

    const result = await NotificationService.getUserNotifications(
      userId,
      validated.page,
      validated.limit,
      validated.unreadOnly
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'Notifications retrieved successfully',
      data: result.notifications,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Get unread notification count
   * GET /api/v1/notifications/unread-count
   */
  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await NotificationService.getUnreadCount(userId);

    sendResponse(res, {
      statusCode: 200,
      message: 'Unread count retrieved successfully',
      data: { count },
    });
  });

  /**
   * Mark notification as read
   * PATCH /api/v1/notifications/:notificationId/read
   */
  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notificationId = req.params.notificationId as string;

    const notification = await NotificationService.markAsRead(userId, notificationId);

    sendResponse(res, {
      statusCode: 200,
      message: 'Notification marked as read',
      data: notification,
    });
  });

  /**
   * Mark all notifications as read
   * PATCH /api/v1/notifications/read-all
   */
  static markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await NotificationService.markAllAsRead(userId);

    sendResponse(res, {
      statusCode: 200,
      message: `${count} notifications marked as read`,
      data: { count },
    });
  });

  /**
   * Delete a notification
   * DELETE /api/v1/notifications/:notificationId
   */
  static deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notificationId = req.params.notificationId as string;

    await NotificationService.deleteNotification(userId, notificationId);

    sendResponse(res, {
      statusCode: 200,
      message: 'Notification deleted successfully',
    });
  });

  /**
   * Delete all read notifications
   * DELETE /api/v1/notifications/read
   */
  static deleteAllRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await NotificationService.deleteAllRead(userId);

    sendResponse(res, {
      statusCode: 200,
      message: `${count} notifications deleted`,
      data: { count },
    });
  });
}
