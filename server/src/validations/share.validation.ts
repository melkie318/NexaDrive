import { z } from 'zod';

// ─── Create Direct Share ──────────────────────────────────────────────────────

export const createDirectShareSchema = z
  .object({
    fileId: z.string().uuid('fileId must be a valid UUID').optional(),
    folderId: z.string().uuid('folderId must be a valid UUID').optional(),
    targetUserId: z.string().uuid('targetUserId must be a valid UUID'),
    role: z.enum(['VIEWER', 'EDITOR', 'OWNER', 'MANAGER', 'CONTRIBUTOR']),
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

// ─── Create Group Share ───────────────────────────────────────────────────────

export const createGroupShareSchema = z
  .object({
    fileId: z.string().uuid('fileId must be a valid UUID').optional(),
    folderId: z.string().uuid('folderId must be a valid UUID').optional(),
    targetGroupId: z.string().uuid('targetGroupId must be a valid UUID'),
    role: z.enum(['VIEWER', 'EDITOR', 'OWNER', 'MANAGER', 'CONTRIBUTOR']),
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

// ─── Exported Types ───────────────────────────────────────────────────────────

export type CreateDirectShareInput = z.infer<typeof createDirectShareSchema>;
export type CreateGroupShareInput = z.infer<typeof createGroupShareSchema>;
