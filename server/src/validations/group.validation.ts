import { z } from 'zod';

// ─── Create Group ─────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
});

// ─── Update Group ─────────────────────────────────────────────────────────────

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name cannot exceed 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
});

// ─── Add Member ───────────────────────────────────────────────────────────────

export const addMemberSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
});

// ─── Update Member Role ───────────────────────────────────────────────────────

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
