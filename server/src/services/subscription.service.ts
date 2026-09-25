import { prisma } from '../lib/prisma';
import { SubscriptionStatus } from '@prisma/client';
import { SocketService } from './socket.service';

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  durationMonths?: number;
}

export class SubscriptionService {
  /**
   * Create a new subscription
   */
  static async createSubscription(data: CreateSubscriptionData) {
    const { userId, planId, durationMonths = 1 } = data;

    // Verify plan exists
    const plan = await prisma.storagePlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('Storage plan not found');
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new Error('User already has an active subscription');
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    // Update user's storage quota
    await prisma.user.update({
      where: { id: userId },
      data: {
        storageQuota: plan.quotaBytes,
      },
    });

    // Emit real-time quota update event
    if (SocketService.isInitialized()) {
      SocketService.emitQuotaUpdated(userId, {
        userId,
        oldQuota: '0', // Could track previous quota if needed
        newQuota: plan.quotaBytes.toString(),
        usedStorage: '0', // Will be fetched from user
        timestamp: new Date(),
      });
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        priceETB: subscription.plan.priceETB,
        quotaBytes: subscription.plan.quotaBytes.toString(),
        quotaGB: Number(subscription.plan.quotaBytes) / (1024 * 1024 * 1024),
      },
    };
  }

  /**
   * Get user's current subscription
   */
  static async getUserSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        priceETB: subscription.plan.priceETB,
        quotaBytes: subscription.plan.quotaBytes.toString(),
        quotaGB: Number(subscription.plan.quotaBytes) / (1024 * 1024 * 1024),
      },
    };
  }

  /**
   * Get all subscriptions for a user (including inactive)
   */
  static async getUserSubscriptionHistory(userId: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        priceETB: sub.plan.priceETB,
        quotaBytes: sub.plan.quotaBytes.toString(),
        quotaGB: Number(sub.plan.quotaBytes) / (1024 * 1024 * 1024),
      },
    }));
  }

  /**
   * Cancel user's subscription
   */
  static async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new Error('Unauthorized to cancel this subscription');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Subscription is not active');
    }

    // Update subscription status
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELED,
      },
      include: {
        plan: true,
      },
    });

    // Revert to default plan quota
    const defaultPlan = await prisma.storagePlan.findFirst({
      where: { isDefault: true },
    });

    if (defaultPlan) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          storageQuota: defaultPlan.quotaBytes,
        },
      });
    }

    return {
      id: updated.id,
      userId: updated.userId,
      status: updated.status,
      canceledAt: new Date(),
    };
  }

  /**
   * Upgrade subscription to a higher plan
   */
  static async upgradeSubscription(userId: string, newPlanId: string) {
    // Get current active subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: true,
      },
    });

    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    // Get new plan
    const newPlan = await prisma.storagePlan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new Error('New storage plan not found');
    }

    // Validate upgrade (new plan should have more storage)
    if (newPlan.quotaBytes <= currentSubscription.plan.quotaBytes) {
      throw new Error('New plan must have more storage than current plan');
    }

    // Cancel current subscription
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
      },
    });

    // Create new subscription (inherit remaining time + new duration)
    const remainingDays = currentSubscription.endDate
      ? Math.max(
          0,
          Math.ceil(
            (currentSubscription.endDate.getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + remainingDays + 30); // Add 1 month

    const newSubscription = await prisma.subscription.create({
      data: {
        userId,
        planId: newPlanId,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
      include: {
        plan: true,
      },
    });

    // Update user's storage quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuota: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        storageQuota: newPlan.quotaBytes,
      },
    });

    // Emit real-time quota update event
    if (SocketService.isInitialized()) {
      SocketService.emitQuotaUpdated(userId, {
        userId,
        oldQuota: user?.storageQuota.toString() || '0',
        newQuota: newPlan.quotaBytes.toString(),
        usedStorage: '0',
        timestamp: new Date(),
      });
    }

    return {
      id: newSubscription.id,
      userId: newSubscription.userId,
      planId: newSubscription.planId,
      status: newSubscription.status,
      startDate: newSubscription.startDate,
      endDate: newSubscription.endDate,
      plan: {
        id: newSubscription.plan.id,
        name: newSubscription.plan.name,
        priceETB: newSubscription.plan.priceETB,
        quotaBytes: newSubscription.plan.quotaBytes.toString(),
        quotaGB: Number(newSubscription.plan.quotaBytes) / (1024 * 1024 * 1024),
      },
    };
  }

  /**
   * Renew subscription (extend end date)
   */
  static async renewSubscription(
    userId: string,
    subscriptionId: string,
    durationMonths: number = 1
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new Error('Unauthorized to renew this subscription');
    }

    // Calculate new end date
    const currentEndDate = subscription.endDate || new Date();
    const newEndDate = new Date(
      Math.max(currentEndDate.getTime(), new Date().getTime())
    );
    newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

    // Update subscription
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        endDate: newEndDate,
      },
      include: {
        plan: true,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      status: updated.status,
      endDate: updated.endDate,
      plan: {
        id: updated.plan.id,
        name: updated.plan.name,
        priceETB: updated.plan.priceETB,
      },
    };
  }

  /**
   * Check and expire subscriptions (should be run as a cron job)
   */
  static async checkAndExpireSubscriptions() {
    const now = new Date();

    // Find all active subscriptions that have passed their end date
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lte: now,
        },
      },
      include: {
        user: true,
      },
    });

    const results = [];

    for (const subscription of expiredSubscriptions) {
      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
        },
      });

      // Revert user to default plan quota
      const defaultPlan = await prisma.storagePlan.findFirst({
        where: { isDefault: true },
      });

      if (defaultPlan) {
        await prisma.user.update({
          where: { id: subscription.userId },
          data: {
            storageQuota: defaultPlan.quotaBytes,
          },
        });
      }

      results.push({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        email: subscription.user.email,
        expiredAt: subscription.endDate,
      });
    }

    return {
      expiredCount: results.length,
      subscriptions: results,
    };
  }

  /**
   * Get subscription statistics
   */
  static async getSubscriptionStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      expiredSubscriptions,
      planBreakdown,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatus.CANCELED },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatus.EXPIRED },
      }),
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: SubscriptionStatus.ACTIVE },
        _count: true,
      }),
    ]);

    // Get plan names for breakdown
    const planIds = planBreakdown.map(p => p.planId);
    const plans = await prisma.storagePlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    });

    const planMap = new Map(plans.map(p => [p.id, p.name]));

    return {
      total: totalSubscriptions,
      active: activeSubscriptions,
      canceled: canceledSubscriptions,
      expired: expiredSubscriptions,
      byPlan: planBreakdown.map(p => ({
        planId: p.planId,
        planName: planMap.get(p.planId) || 'Unknown',
        count: p._count,
      })),
    };
  }
}
