import { z } from 'zod';

// ─── Grant Permission ─────────────────────────────────────────────────────────

export const grantPermissionSchema = z
  .object({
    userId: z.string().uuid('userId must be a valid UUID').optional(),
    groupId: z.string().uuid('groupId must be a valid UUID').optional(),
    role: z.enum(['OWNER', 'MANAGER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER', 'CUSTOM']),
    customOps: z
      .array(
        z.enum([
          'canView', 'canDownload', 'canUpload', 'canEdit', 'canRename',
          'canMove', 'canCopy', 'canDelete', 'canRestore', 'canCompress',
          'canExtract', 'canShare', 'canManagePermissions',
        ]),
      )
      .optional()
      .default([]),
  })
  .refine((data) => !!(data.userId || data.groupId), {
    message: 'Either userId or groupId must be provided',
    path: ['userId'],
  })
  .refine((data) => !(data.userId && data.groupId), {
    message: 'Provide either userId or groupId, not both',
    path: ['groupId'],
  })
  .refine(
    (data) => data.role !== 'CUSTOM' || (data.customOps && data.customOps.length > 0),
    {
      message: 'customOps must be provided when role is CUSTOM',
      path: ['customOps'],
    },
  );

// ─── Update Permission ────────────────────────────────────────────────────────

export const updatePermissionSchema = z
  .object({
    role: z
      .enum(['OWNER', 'MANAGER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER', 'CUSTOM'])
      .optional(),
    customOps: z
      .array(
        z.enum([
          'canView', 'canDownload', 'canUpload', 'canEdit', 'canRename',
          'canMove', 'canCopy', 'canDelete', 'canRestore', 'canCompress',
          'canExtract', 'canShare', 'canManagePermissions',
        ]),
      )
      .optional(),
  })
  .refine((data) => data.role !== undefined || data.customOps !== undefined, {
    message: 'At least one of role or customOps must be provided',
    path: ['role'],
  })
  .refine(
    (data) =>
      data.role !== 'CUSTOM' ||
      (data.customOps !== undefined && data.customOps.length > 0),
    {
      message: 'customOps must be provided when role is CUSTOM',
      path: ['customOps'],
    },
  );

// ─── Exported Types ───────────────────────────────────────────────────────────

export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
