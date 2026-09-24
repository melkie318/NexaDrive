import { z } from 'zod';

/**
 * Validation schema for getting activities
 */
export const getActivitiesSchema = z.object({
  action: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for activity stats
 */
export const getActivityStatsSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(7),
});
