import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { PaymentService } from '../services/payment.service';
import {
  initializePaymentSchema,
  verifyPaymentSchema,
  getPaymentByIdSchema,
  getUserPaymentsSchema,
} from '../validations/payment.validation';

export class PaymentController {
  /**
   * Initialize payment with Chapa
   */
  static initializePayment = asyncHandler(async (req: Request, res: Response) => {
    const validated = initializePaymentSchema.parse(req.body);
    const userId = req.user!.id;

    const payment = await PaymentService.initializePayment({
      userId,
      planId: validated.planId,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      returnUrl: validated.returnUrl,
      durationMonths: validated.durationMonths,
    });

    return sendResponse(res, {
      statusCode: 201,
      message: 'Payment initialized successfully',
      data: payment,
    });
  });

  /**
   * Verify payment
   */
  static verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const validated = verifyPaymentSchema.parse(req.query);

    const result = await PaymentService.verifyPayment(validated);

    return sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  });

  /**
   * Handle Chapa webhook
   */
  static handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await PaymentService.handleWebhook(payload);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Webhook processed successfully',
      data: result,
    });
  });

  /**
   * Get user's payment history
   */
  static getUserPayments = asyncHandler(async (req: Request, res: Response) => {
    const validated = getUserPaymentsSchema.parse(req.query);
    const userId = req.user!.id;

    const result = await PaymentService.getUserPayments(
      userId,
      validated.page,
      validated.limit
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Payment history retrieved successfully',
      data: result.payments,
      meta: result.pagination,
    });
  });

  /**
   * Get payment by ID
   */
  static getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const validated = getPaymentByIdSchema.parse(req.params);
    const userId = req.user!.id;

    const payment = await PaymentService.getPaymentById(userId, validated.paymentId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Payment details retrieved successfully',
      data: payment,
    });
  });

  /**
   * Get payment statistics (Admin only)
   */
  static getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await PaymentService.getPaymentStats();

    return sendResponse(res, {
      statusCode: 200,
      message: 'Payment statistics retrieved successfully',
      data: stats,
    });
  });
}
