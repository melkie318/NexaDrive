import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export class AdminService {
  /**
   * Get all users with pagination and optional filters
   */
  static async getAllUsers(options: {
    page?: number;
    limit?: number;
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 20, role, isActive, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          storageQuota: true,
          usedStorage: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              files: true,
              folders: true,
              activityLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed user information by ID
   */
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        storageQuota: true,
        usedStorage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: true,
            folders: true,
            createdShares: true,
            receivedShares: true,
            groupMemberships: true,
            activityLogs: true,
            notifications: true,
            subscriptions: true,
            payments: true,
          },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            plan: true,
          },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user role (promote to ADMIN or demote to USER)
   */
  static async updateUserRole(userId: string, newRole: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Suspend or activate a user account
   */
  static async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Update user storage quota
   */
  static async updateUserQuota(userId: string, quotaBytes: bigint) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { storageQuota: quotaBytes },
      select: {
        id: true,
        email: true,
        username: true,
        storageQuota: true,
        usedStorage: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Delete a user account and all associated data
   */
  static async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Prisma cascade will handle deletion of related records
    await prisma.user.delete({
      where: { id: userId },
    });

    return { id: userId, email: user.email, username: user.username };
  }

  /**
   * Get system-wide statistics
   */
  static async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalFiles,
      totalFolders,
      totalStorage,
      totalGroups,
      totalShares,
      totalActivities,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.file.count(),
      prisma.folder.count(),
      prisma.user.aggregate({
        _sum: { usedStorage: true },
      }),
      prisma.group.count(),
      prisma.share.count(),
      prisma.activity.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        admins: adminUsers,
      },
      content: {
        files: totalFiles,
        folders: totalFolders,
      },
      storage: {
        totalUsed: totalStorage._sum.usedStorage?.toString() || '0',
        totalUsedGB: Number(totalStorage._sum.usedStorage || 0n) / (1024 ** 3),
      },
      collaboration: {
        groups: totalGroups,
        shares: totalShares,
      },
      activities: totalActivities,
      recentUsers,
    };
  }

  /**
   * Get storage statistics breakdown
   */
  static async getStorageStats() {
    const [topUsers, fileTypeStats, totalStats] = await Promise.all([
      // Top 10 users by storage usage
      prisma.user.findMany({
        take: 10,
        orderBy: { usedStorage: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          usedStorage: true,
          storageQuota: true,
          _count: {
            select: { files: true },
          },
        },
      }),
      // File type distribution
      prisma.$queryRaw<Array<{ mimeType: string; count: bigint; totalSize: bigint }>>`
        SELECT 
          "mimeType",
          COUNT(*)::bigint as count,
          SUM("size")::bigint as "totalSize"
        FROM files
        WHERE "isTrashed" = false
        GROUP BY "mimeType"
        ORDER BY "totalSize" DESC
        LIMIT 10
      `,
      // Total statistics
      prisma.file.aggregate({
        where: { isTrashed: false },
        _sum: { size: true },
        _count: true,
        _avg: { size: true },
      }),
    ]);

    return {
      topUsers: topUsers.map(user => ({
        ...user,
        usedStorage: user.usedStorage.toString(),
        storageQuota: user.storageQuota.toString(),
        usagePercentage: Number((user.usedStorage * 100n) / user.storageQuota),
      })),
      fileTypes: fileTypeStats.map(stat => ({
        mimeType: stat.mimeType,
        count: stat.count.toString(),
        totalSize: stat.totalSize.toString(),
        totalSizeMB: Number(stat.totalSize) / (1024 * 1024),
      })),
      totals: {
        totalFiles: totalStats._count,
        totalSize: totalStats._sum.size?.toString() || '0',
        totalSizeGB: Number(totalStats._sum.size || 0n) / (1024 ** 3),
        averageFileSize: totalStats._avg.size || 0,
        averageFileSizeMB: Number(totalStats._avg.size || 0) / (1024 * 1024),
      },
    };
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [activityByAction, activityByDay, topActiveUsers] = await Promise.all([
      // Activities grouped by action type
      prisma.$queryRaw<Array<{ action: string; count: bigint }>>`
        SELECT 
          action,
          COUNT(*)::bigint as count
        FROM activities
        WHERE "createdAt" >= ${startDate}
        GROUP BY action
        ORDER BY count DESC
      `,
      // Activities by day
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::bigint as count
        FROM activities
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Most active users
      prisma.activity.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Fetch user details for top active users
    const userIds = topActiveUsers.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      byAction: activityByAction.map(stat => ({
        action: stat.action,
        count: stat.count.toString(),
      })),
      byDay: activityByDay.map(stat => ({
        date: stat.date,
        count: stat.count.toString(),
      })),
      topUsers: topActiveUsers.map(stat => ({
        user: userMap.get(stat.userId),
        activityCount: stat._count,
      })),
    };
  }

  /**
   * Clean up old data (trash items, activities, expired tokens)
   */
  static async cleanupOldData(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const [deletedTrash, deletedActivities, deletedTokens] = await Promise.all([
      // Delete trash items older than threshold
      prisma.trashItem.deleteMany({
        where: {
          deletedAt: { lt: cutoffDate },
        },
      }),
      // Delete old activity logs
      prisma.activity.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      }),
      // Delete expired refresh tokens
      prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      }),
    ]);

    return {
      deletedTrashItems: deletedTrash.count,
      deletedActivities: deletedActivities.count,
      deletedExpiredTokens: deletedTokens.count,
      cutoffDate,
    };
  }

  /**
   * Get recent system activities (all users)
   */
  static async getRecentActivities(limit: number = 50) {
    const activities = await prisma.activity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return activities;
  }
}
