import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { SubscriptionService } from '../services/subscription.service';
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  upgradeSubscriptionSchema,
  renewSubscriptionSchema,
} from '../validations/payment.validation';

export class SubscriptionController {
  /**
   * Create a new subscription (usually after payment)
   */
  static createSubscription = asyncHandler(async (req: Request, res: Response) => {
    const validated = createSubscriptionSchema.parse(req.body);
    const userId = req.user!.id;

    const subscription = await SubscriptionService.createSubscription({
      userId,
      planId: validated.planId,
      durationMonths: validated.durationMonths,
    });

    return sendResponse(res, {
      statusCode: 201,
      message: 'Subscription created successfully',
      data: subscription,
    });
  });

  /**
   * Get user's current subscription
   */
  static getCurrentSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const subscription = await SubscriptionService.getUserSubscription(userId);

    if (!subscription) {
      return sendResponse(res, {
        statusCode: 404,
        message: 'No active subscription found',
        data: null,
      });
    }

    return sendResponse(res, {
      statusCode: 200,
      message: 'Current subscription retrieved successfully',
      data: subscription,
    });
  });

  /**
   * Get user's subscription history
   */
  static getSubscriptionHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const history = await SubscriptionService.getUserSubscriptionHistory(userId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Subscription history retrieved successfully',
      data: history,
    });
  });

  /**
   * Cancel subscription
   */
  static cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const validated = cancelSubscriptionSchema.parse(req.params);
    const userId = req.user!.id;

    const result = await SubscriptionService.cancelSubscription(
      userId,
      validated.subscriptionId
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Subscription canceled successfully',
      data: result,
    });
  });

  /**
   * Upgrade subscription to higher plan
   */
  static upgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const validated = upgradeSubscriptionSchema.parse(req.body);
    const userId = req.user!.id;

    const subscription = await SubscriptionService.upgradeSubscription(
      userId,
      validated.newPlanId
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Subscription upgraded successfully',
      data: subscription,
    });
  });

  /**
   * Renew subscription
   */
  static renewSubscription = asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionId } = cancelSubscriptionSchema.parse(req.params);
    const { durationMonths } = renewSubscriptionSchema.parse({
      subscriptionId,
      ...req.body,
    });
    const userId = req.user!.id;

    const subscription = await SubscriptionService.renewSubscription(
      userId,
      subscriptionId,
      durationMonths
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Subscription renewed successfully',
      data: subscription,
    });
  });

  /**
   * Get subscription statistics (Admin only)
   */
  static getSubscriptionStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await SubscriptionService.getSubscriptionStats();

    return sendResponse(res, {
      statusCode: 200,
      message: 'Subscription statistics retrieved successfully',
      data: stats,
    });
  });

  /**
   * Check and expire subscriptions (Admin/Cron job)
   */
  static checkExpiredSubscriptions = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await SubscriptionService.checkAndExpireSubscriptions();

      return sendResponse(res, {
        statusCode: 200,
        message: 'Subscription expiry check completed',
        data: result,
      });
    }
  );
}
