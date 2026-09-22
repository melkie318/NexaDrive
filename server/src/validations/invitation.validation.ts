import { z } from 'zod';

// ─── Create Invitation ────────────────────────────────────────────────────────

export const createInvitationSchema = z
  .object({
    fileId: z.string().uuid('fileId must be a valid UUID').optional(),
    folderId: z.string().uuid('folderId must be a valid UUID').optional(),
    inviteeEmail: z.string().email('inviteeEmail must be a valid email address'),
    role: z.enum(['VIEWER', 'EDITOR', 'OWNER', 'MANAGER', 'CONTRIBUTOR']),
    expiresAt: z
      .string()
      .datetime('expiresAt must be a valid ISO 8601 datetime')
      .transform((val) => new Date(val))
      .optional(),
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

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
