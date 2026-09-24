import { Request, Response } from 'express';
import { ActivityService } from '../services/activity.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { getActivitiesSchema, getActivityStatsSchema } from '../validations/activity.validation';

export class ActivityController {
  /**
   * Get user activities
   * GET /api/v1/activities
   */
  static getActivities = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = getActivitiesSchema.parse(req.query);

    const filters = {
      action: validated.action,
      startDate: validated.startDate,
      endDate: validated.endDate,
    };

    const result = await ActivityService.getUserActivities(
      userId,
      filters,
      validated.page,
      validated.limit
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'Activities retrieved successfully',
      data: result.activities,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Get recent activities
   * GET /api/v1/activities/recent
   */
  static getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const activities = await ActivityService.getRecentActivities(userId, limit);

    sendResponse(res, {
      statusCode: 200,
      message: 'Recent activities retrieved successfully',
      data: activities,
    });
  });

  /**
   * Get activity statistics
   * GET /api/v1/activities/stats
   */
  static getActivityStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = getActivityStatsSchema.parse(req.query);

    const stats = await ActivityService.getActivityStats(userId, validated.days);

    sendResponse(res, {
      statusCode: 200,
      message: 'Activity statistics retrieved successfully',
      data: stats,
    });
  });
}
