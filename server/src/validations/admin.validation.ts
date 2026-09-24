import { z } from 'zod';

/**
 * Validation schema for getting all users with filters
 */
export const getAllUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
});

/**
 * Validation schema for getting user by ID
 */
export const getUserByIdSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
});

/**
 * Validation schema for updating user role
 */
export const updateUserRoleSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  role: z.enum(['USER', 'ADMIN']),
});

/**
 * Validation schema for toggling user status (suspend/activate)
 */
export const toggleUserStatusSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  isActive: z.boolean(),
});

/**
 * Validation schema for updating user storage quota
 */
export const updateUserQuotaSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  quotaGB: z.number().positive('Quota must be positive').max(10000, 'Quota cannot exceed 10TB'),
});

/**
 * Validation schema for deleting a user
 */
export const deleteUserSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
});

/**
 * Validation schema for getting activity statistics
 */
export const getActivityStatsSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(7),
});

/**
 * Validation schema for cleanup operation
 */
export const cleanupOldDataSchema = z.object({
  daysOld: z.coerce.number().int().min(7).max(365).optional().default(30),
});

/**
 * Validation schema for getting recent activities
 */
export const getRecentActivitiesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type GetAllUsersInput = z.infer<typeof getAllUsersSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
export type UpdateUserQuotaInput = z.infer<typeof updateUserQuotaSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
export type GetActivityStatsInput = z.infer<typeof getActivityStatsSchema>;
export type CleanupOldDataInput = z.infer<typeof cleanupOldDataSchema>;
export type GetRecentActivitiesInput = z.infer<typeof getRecentActivitiesSchema>;
