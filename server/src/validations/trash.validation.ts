import { z } from 'zod';

// ─── Move to Trash ────────────────────────────────────────────────────────────

export const moveToTrashSchema = z
  .object({
    fileId: z.string().uuid('fileId must be a valid UUID').optional(),
    folderId: z.string().uuid('folderId must be a valid UUID').optional(),
  })
  .refine(
    (data) => {
      // Exactly one of fileId or folderId must be provided
      return (data.fileId && !data.folderId) || (!data.fileId && data.folderId);
    },
    {
      message: 'Specify exactly one of fileId or folderId',
    },
  );

// ─── Query Trash ──────────────────────────────────────────────────────────────

export const listTrashSchema = z.object({
  type: z.enum(['file', 'folder', 'all']).optional().default('all'),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type MoveToTrashInput = z.infer<typeof moveToTrashSchema>;
export type ListTrashInput = z.infer<typeof listTrashSchema>;
