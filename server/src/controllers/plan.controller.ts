import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { PlanService } from '../services/plan.service';
import {
  createPlanSchema,
  updatePlanSchema,
  getPlanByIdSchema,
  deletePlanSchema,
} from '../validations/payment.validation';

export class PlanController {
  /**
   * Create a new storage plan (Admin only)
   */
  static createPlan = asyncHandler(async (req: Request, res: Response) => {
    const validated = createPlanSchema.parse(req.body);

    const plan = await PlanService.createPlan(validated);

    return sendResponse(res, {
      statusCode: 201,
      message: 'Storage plan created successfully',
      data: plan,
    });
  });

  /**
   * Get all storage plans
   */
  static getAllPlans = asyncHandler(async (req: Request, res: Response) => {
    const plans = await PlanService.getAllPlans();

    return sendResponse(res, {
      statusCode: 200,
      message: 'Storage plans retrieved successfully',
      data: plans,
    });
  });

  /**
   * Get storage plan by ID
   */
  static getPlanById = asyncHandler(async (req: Request, res: Response) => {
    const validated = getPlanByIdSchema.parse(req.params);

    const plan = await PlanService.getPlanById(validated.planId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Storage plan retrieved successfully',
      data: plan,
    });
  });

  /**
   * Get default storage plan
   */
  static getDefaultPlan = asyncHandler(async (req: Request, res: Response) => {
    const plan = await PlanService.getDefaultPlan();

    return sendResponse(res, {
      statusCode: 200,
      message: 'Default storage plan retrieved successfully',
      data: plan,
    });
  });

  /**
   * Update storage plan (Admin only)
   */
  static updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const { planId } = getPlanByIdSchema.parse(req.params);
    const validated = updatePlanSchema.parse(req.body);

    const plan = await PlanService.updatePlan(planId, validated);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Storage plan updated successfully',
      data: plan,
    });
  });

  /**
   * Delete storage plan (Admin only)
   */
  static deletePlan = asyncHandler(async (req: Request, res: Response) => {
    const validated = deletePlanSchema.parse(req.params);

    const result = await PlanService.deletePlan(validated.planId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Storage plan deleted successfully',
      data: result,
    });
  });

  /**
   * Seed default storage plans (Admin only)
   */
  static seedPlans = asyncHandler(async (req: Request, res: Response) => {
    const result = await PlanService.seedDefaultPlans();

    return sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  });
}
