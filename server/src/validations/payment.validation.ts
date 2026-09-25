import { z } from 'zod';

/**
 * Validation schema for creating a storage plan
 */
export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(50, 'Plan name too long'),
  priceETB: z.number().min(0, 'Price must be non-negative'),
  quotaGB: z.number().min(0.001, 'Quota must be positive').max(10000, 'Quota cannot exceed 10TB'),
  isDefault: z.boolean().optional(),
});

/**
 * Validation schema for updating a storage plan
 */
export const updatePlanSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  priceETB: z.number().min(0).optional(),
  quotaGB: z.number().min(0.001).max(10000).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Validation schema for getting plan by ID
 */
export const getPlanByIdSchema = z.object({
  planId: z.string().uuid('Invalid plan ID format'),
});

/**
 * Validation schema for deleting a plan
 */
export const deletePlanSchema = z.object({
  planId: z.string().uuid('Invalid plan ID format'),
});

/**
 * Validation schema for initializing payment
 */
export const initializePaymentSchema = z.object({
  planId: z.string().uuid('Invalid plan ID format'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email format'),
  returnUrl: z.string().url('Invalid return URL').optional(),
  durationMonths: z.number().int().min(1).max(12).optional(),
});

/**
 * Validation schema for verifying payment
 */
export const verifyPaymentSchema = z.object({
  txRef: z.string().min(1, 'Transaction reference is required'),
});

/**
 * Validation schema for getting payment by ID
 */
export const getPaymentByIdSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
});

/**
 * Validation schema for getting user payments (pagination)
 */
export const getUserPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for creating subscription
 */
export const createSubscriptionSchema = z.object({
  planId: z.string().uuid('Invalid plan ID format'),
  durationMonths: z.number().int().min(1).max(12).optional(),
});

/**
 * Validation schema for canceling subscription
 */
export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
});

/**
 * Validation schema for upgrading subscription
 */
export const upgradeSubscriptionSchema = z.object({
  newPlanId: z.string().uuid('Invalid plan ID format'),
});

/**
 * Validation schema for renewing subscription
 */
export const renewSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  durationMonths: z.number().int().min(1).max(12).optional(),
});

/**
 * Type exports
 */
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type GetPlanByIdInput = z.infer<typeof getPlanByIdSchema>;
export type DeletePlanInput = z.infer<typeof deletePlanSchema>;
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type GetPaymentByIdInput = z.infer<typeof getPaymentByIdSchema>;
export type GetUserPaymentsInput = z.infer<typeof getUserPaymentsSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpgradeSubscriptionInput = z.infer<typeof upgradeSubscriptionSchema>;
export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>;
