import { prisma } from '../lib/prisma';

export interface CreatePlanData {
  name: string;
  priceETB: number;
  quotaGB: number;
  isDefault?: boolean;
}

export interface UpdatePlanData {
  name?: string;
  priceETB?: number;
  quotaGB?: number;
  isDefault?: boolean;
}

export class PlanService {
  /**
   * Create a new storage plan
   */
  static async createPlan(data: CreatePlanData) {
    // Convert GB to bytes
    const quotaBytes = BigInt(Math.floor(data.quotaGB * 1024 * 1024 * 1024));

    // If this plan is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.storagePlan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const plan = await prisma.storagePlan.create({
      data: {
        name: data.name,
        priceETB: data.priceETB,
        quotaBytes,
        isDefault: data.isDefault || false,
      },
    });

    return {
      ...plan,
      quotaBytes: plan.quotaBytes.toString(),
      quotaGB: data.quotaGB,
    };
  }

  /**
   * Get all storage plans
   */
  static async getAllPlans() {
    const plans = await prisma.storagePlan.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { priceETB: 'asc' },
      ],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      priceETB: plan.priceETB,
      quotaBytes: plan.quotaBytes.toString(),
      quotaGB: Number(plan.quotaBytes) / (1024 * 1024 * 1024),
      isDefault: plan.isDefault,
      createdAt: plan.createdAt,
      subscriberCount: plan._count.subscriptions,
    }));
  }

  /**
   * Get storage plan by ID
   */
  static async getPlanById(planId: string) {
    const plan = await prisma.storagePlan.findUnique({
      where: { id: planId },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new Error('Storage plan not found');
    }

    return {
      id: plan.id,
      name: plan.name,
      priceETB: plan.priceETB,
      quotaBytes: plan.quotaBytes.toString(),
      quotaGB: Number(plan.quotaBytes) / (1024 * 1024 * 1024),
      isDefault: plan.isDefault,
      createdAt: plan.createdAt,
      subscriberCount: plan._count.subscriptions,
    };
  }

  /**
   * Get storage plan by name
   */
  static async getPlanByName(name: string) {
    const plan = await prisma.storagePlan.findUnique({
      where: { name },
    });

    if (!plan) {
      throw new Error('Storage plan not found');
    }

    return {
      id: plan.id,
      name: plan.name,
      priceETB: plan.priceETB,
      quotaBytes: plan.quotaBytes.toString(),
      quotaGB: Number(plan.quotaBytes) / (1024 * 1024 * 1024),
      isDefault: plan.isDefault,
      createdAt: plan.createdAt,
    };
  }

  /**
   * Get default storage plan
   */
  static async getDefaultPlan() {
    const plan = await prisma.storagePlan.findFirst({
      where: { isDefault: true },
    });

    if (!plan) {
      throw new Error('No default storage plan configured');
    }

    return {
      id: plan.id,
      name: plan.name,
      priceETB: plan.priceETB,
      quotaBytes: plan.quotaBytes.toString(),
      quotaGB: Number(plan.quotaBytes) / (1024 * 1024 * 1024),
      isDefault: plan.isDefault,
      createdAt: plan.createdAt,
    };
  }

  /**
   * Update storage plan
   */
  static async updatePlan(planId: string, data: UpdatePlanData) {
    const existingPlan = await prisma.storagePlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      throw new Error('Storage plan not found');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.storagePlan.updateMany({
        where: { 
          isDefault: true,
          id: { not: planId },
        },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.priceETB !== undefined) updateData.priceETB = data.priceETB;
    if (data.quotaGB !== undefined) {
      updateData.quotaBytes = BigInt(Math.floor(data.quotaGB * 1024 * 1024 * 1024));
    }
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const plan = await prisma.storagePlan.update({
      where: { id: planId },
      data: updateData,
    });

    return {
      id: plan.id,
      name: plan.name,
      priceETB: plan.priceETB,
      quotaBytes: plan.quotaBytes.toString(),
      quotaGB: Number(plan.quotaBytes) / (1024 * 1024 * 1024),
      isDefault: plan.isDefault,
      createdAt: plan.createdAt,
    };
  }

  /**
   * Delete storage plan
   */
  static async deletePlan(planId: string) {
    const plan = await prisma.storagePlan.findUnique({
      where: { id: planId },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new Error('Storage plan not found');
    }

    // Prevent deletion if plan has active subscriptions
    if (plan._count.subscriptions > 0) {
      throw new Error(
        `Cannot delete plan with ${plan._count.subscriptions} active subscriptions`
      );
    }

    // Prevent deletion of default plan
    if (plan.isDefault) {
      throw new Error('Cannot delete the default storage plan');
    }

    await prisma.storagePlan.delete({
      where: { id: planId },
    });

    return {
      id: plan.id,
      name: plan.name,
    };
  }

  /**
   * Seed default storage plans (for initial setup)
   */
  static async seedDefaultPlans() {
    const existingPlans = await prisma.storagePlan.count();
    
    if (existingPlans > 0) {
      return { message: 'Storage plans already exist', count: existingPlans };
    }

    const defaultPlans = [
      {
        name: 'Free',
        priceETB: 0,
        quotaBytes: BigInt(5 * 1024 * 1024 * 1024), // 5 GB
        isDefault: true,
      },
      {
        name: 'Premium',
        priceETB: 199,
        quotaBytes: BigInt(100 * 1024 * 1024 * 1024), // 100 GB
        isDefault: false,
      },
      {
        name: 'Business',
        priceETB: 499,
        quotaBytes: BigInt(1024 * 1024 * 1024 * 1024), // 1 TB
        isDefault: false,
      },
    ];

    await prisma.storagePlan.createMany({
      data: defaultPlans,
    });

    return {
      message: 'Default storage plans created successfully',
      count: defaultPlans.length,
    };
  }
}
