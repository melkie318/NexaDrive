import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export enum ActivityAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  CREATE_FOLDER = 'CREATE_FOLDER',
  RENAME = 'RENAME',
  MOVE = 'MOVE',
  COPY = 'COPY',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  SHARE = 'SHARE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  INVITE = 'INVITE',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

export interface ActivityDetails {
  resourceId?: string;
  resourceName?: string;
  resourceType?: 'file' | 'folder';
  targetId?: string;
  targetName?: string;
  fromPath?: string;
  toPath?: string;
  shareWith?: string;
  permission?: string;
  [key: string]: any;
}

export interface ActivityFilters {
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ActivityService {
  /**
   * Log an activity
   */
  static async logActivity(
    userId: string,
    action: ActivityAction,
    details?: ActivityDetails,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.activity.create({
        data: {
          userId,
          action,
          details: details ? JSON.stringify(details) : null,
          ipAddress,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error - activity logging should not break main operations
    }
  }

  /**
   * Get user activities with pagination and filtering
   */
  static async getUserActivities(
    userId: string,
    filters?: ActivityFilters,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityWhereInput = {
      userId,
    };

    // Action filter
    if (filters?.action) {
      where.action = filters.action;
    }

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          action: true,
          details: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      prisma.activity.count({ where }),
    ]);

    // Parse JSON details
    const activitiesWithDetails = activities.map((activity) => ({
      ...activity,
      details: activity.details ? JSON.parse(activity.details) : null,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      activities: activitiesWithDetails,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get recent activities (last N activities)
   */
  static async getRecentActivities(userId: string, limit: number = 10) {
    const activities = await prisma.activity.findMany({
      where: {
        userId,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        action: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return activities.map((activity) => ({
      ...activity,
      details: activity.details ? JSON.parse(activity.details) : null,
    }));
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(userId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        action: true,
        createdAt: true,
      },
    });

    // Group by action
    const actionCounts: Record<string, number> = {};
    activities.forEach((activity) => {
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    activities.forEach((activity) => {
      const day = activity.createdAt.toISOString().split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    return {
      totalActivities: activities.length,
      actionCounts,
      dailyCounts,
      period: `${days} days`,
    };
  }

  /**
   * Delete old activities (cleanup)
   */
  static async deleteOldActivities(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.activity.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
