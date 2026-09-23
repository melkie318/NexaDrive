import { z } from 'zod';

// ─── List Versions Query ──────────────────────────────────────────────────────

export const listVersionsSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (val > 0 && val <= 100), {
      message: 'limit must be between 1 and 100',
    }),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type ListVersionsInput = z.infer<typeof listVersionsSchema>;
