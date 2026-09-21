import { z } from 'zod';

// ─── Create Folder ────────────────────────────────────────────────────────────

export const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name cannot be empty')
    .max(255, 'Folder name cannot exceed 255 characters')
    .trim(),
  parentId: z.string().uuid('parentId must be a valid UUID').optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).optional().default('PRIVATE'),
});

// ─── Rename Folder ────────────────────────────────────────────────────────────

export const renameFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name cannot be empty')
    .max(255, 'Folder name cannot exceed 255 characters')
    .trim(),
});

// ─── Move Folder ──────────────────────────────────────────────────────────────

export const moveFolderSchema = z.object({
  // null  → move to root (My Drive)
  // UUID  → move into that parent folder
  parentId: z.string().uuid('parentId must be a valid UUID').nullable(),
});

// ─── List Folders Query ───────────────────────────────────────────────────────

export const listFoldersQuerySchema = z.object({
  // omitting parentId lists root-level folders (parentId IS NULL)
  parentId: z.string().uuid('parentId must be a valid UUID').optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .optional()
    .default(1),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default(50),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameFolderInput = z.infer<typeof renameFolderSchema>;
export type MoveFolderInput = z.infer<typeof moveFolderSchema>;
export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;
