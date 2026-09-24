import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { AdminService } from '../services/admin.service';
import {
  getAllUsersSchema,
  getUserByIdSchema,
  updateUserRoleSchema,
  toggleUserStatusSchema,
  updateUserQuotaSchema,
  deleteUserSchema,
  getActivityStatsSchema,
  cleanupOldDataSchema,
  getRecentActivitiesSchema,
} from '../validations/admin.validation';
import { Role } from '@prisma/client';

export class AdminController {
  /**
   * Get all users with pagination and filters
   */
  static getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const validated = getAllUsersSchema.parse(req.query);

    const result = await AdminService.getAllUsers(validated);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: result,
    });
  });

  /**
   * Get detailed user information by ID
   */
  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const validated = getUserByIdSchema.parse(req.params);

    const user = await AdminService.getUserById(validated.userId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'User details retrieved successfully',
      data: user,
    });
  });

  /**
   * Update user role (promote to ADMIN or demote to USER)
   */
  static updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getUserByIdSchema.parse(req.params);
    const { role } = updateUserRoleSchema.parse({ ...req.params, ...req.body });

    const updatedUser = await AdminService.updateUserRole(userId, role as Role);

    return sendResponse(res, {
      statusCode: 200,
      message: `User role updated to ${role}`,
      data: updatedUser,
    });
  });

  /**
   * Suspend or activate a user account
   */
  static toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getUserByIdSchema.parse(req.params);
    const { isActive } = toggleUserStatusSchema.parse({ ...req.params, ...req.body });

    const updatedUser = await AdminService.toggleUserStatus(userId, isActive);

    return sendResponse(res, {
      statusCode: 200,
      message: `User account ${isActive ? 'activated' : 'suspended'} successfully`,
      data: updatedUser,
    });
  });

  /**
   * Update user storage quota
   */
  static updateUserQuota = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getUserByIdSchema.parse(req.params);
    const { quotaGB } = updateUserQuotaSchema.parse({ ...req.params, ...req.body });

    // Convert GB to bytes
    const quotaBytes = BigInt(Math.floor(quotaGB * 1024 * 1024 * 1024));

    const updatedUser = await AdminService.updateUserQuota(userId, quotaBytes);

    return sendResponse(res, {
      statusCode: 200,
      message: 'User storage quota updated successfully',
      data: {
        ...updatedUser,
        storageQuota: updatedUser.storageQuota.toString(),
        usedStorage: updatedUser.usedStorage.toString(),
        quotaGB,
      },
    });
  });

  /**
   * Delete a user account permanently
   */
  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const validated = deleteUserSchema.parse(req.params);

    // Prevent admin from deleting themselves
    if (req.user?.id === validated.userId) {
      return sendResponse(res, {
        statusCode: 400,
        message: 'You cannot delete your own account',
        data: null,
      });
    }

    const deletedUser = await AdminService.deleteUser(validated.userId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'User account deleted permanently',
      data: deletedUser,
    });
  });

  /**
   * Get system-wide statistics
   */
  static getSystemStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AdminService.getSystemStats();

    return sendResponse(res, {
      statusCode: 200,
      message: 'System statistics retrieved successfully',
      data: stats,
    });
  });

  /**
   * Get storage statistics breakdown
   */
  static getStorageStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AdminService.getStorageStats();

    return sendResponse(res, {
      statusCode: 200,
      message: 'Storage statistics retrieved successfully',
      data: stats,
    });
  });

  /**
   * Get activity statistics
   */
  static getActivityStats = asyncHandler(async (req: Request, res: Response) => {
    const validated = getActivityStatsSchema.parse(req.query);

    const stats = await AdminService.getActivityStats(validated.days);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Activity statistics retrieved successfully',
      data: stats,
    });
  });

  /**
   * Clean up old data (trash items, activities, expired tokens)
   */
  static cleanupOldData = asyncHandler(async (req: Request, res: Response) => {
    const validated = cleanupOldDataSchema.parse(req.query);

    const result = await AdminService.cleanupOldData(validated.daysOld);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Old data cleaned up successfully',
      data: result,
    });
  });

  /**
   * Get recent system activities
   */
  static getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    const validated = getRecentActivitiesSchema.parse(req.query);

    const activities = await AdminService.getRecentActivities(validated.limit);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Recent activities retrieved successfully',
      data: activities,
    });
  });
}
