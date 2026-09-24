import { z } from 'zod';

/**
 * Validation schema for getting notifications
 */
export const getNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

/**
 * Validation schema for marking notification as read
 */
export const markAsReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID format'),
});

/**
 * Validation schema for deleting notification
 */
export const deleteNotificationSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID format'),
});
