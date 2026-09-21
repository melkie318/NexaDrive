import { z } from 'zod';

// ─── Rename File ──────────────────────────────────────────────────────────────

export const renameFileSchema = z.object({
  name: z
    .string()
    .min(1, 'File name cannot be empty')
    .max(255, 'File name cannot exceed 255 characters')
    .trim(),
});

// ─── Move File ────────────────────────────────────────────────────────────────

export const moveFileSchema = z.object({
  // null  → move to root (My Drive, no folder)
  // UUID  → move into that folder
  folderId: z.string().uuid('folderId must be a valid UUID').nullable(),
});

// ─── List Files Query ─────────────────────────────────────────────────────────

export const listFilesQuerySchema = z.object({
  // omitting folderId lists root-level files (folderId IS NULL)
  folderId: z.string().uuid('folderId must be a valid UUID').optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .optional()
    .default('1' as unknown as number),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default('50' as unknown as number),
  sortBy: z.enum(['name', 'size', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type RenameFileInput = z.infer<typeof renameFileSchema>;
export type MoveFileInput = z.infer<typeof moveFileSchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
