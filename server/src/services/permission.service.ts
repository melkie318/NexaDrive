import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { PermissionRole, Prisma } from '@prisma/client';
import {
  GrantPermissionInput,
  UpdatePermissionInput,
} from '../validations/permission.validation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceType = 'file' | 'folder';

export type Operation =
  | 'canView'
  | 'canDownload'
  | 'canUpload'
  | 'canEdit'
  | 'canRename'
  | 'canMove'
  | 'canCopy'
  | 'canDelete'
  | 'canRestore'
  | 'canCompress'
  | 'canExtract'
  | 'canShare'
  | 'canManagePermissions';

// ─── Role → allowed operations mapping ───────────────────────────────────────
//
// OWNER        — full control (everything)
// MANAGER      — everything except managing permissions of other managers/owners
// EDITOR       — can read, write, rename, move, copy, delete; cannot share or manage perms
// CONTRIBUTOR  — can view, download, upload, copy; cannot rename/move/delete/share
// VIEWER       — read-only (view + download)
// CUSTOM       — driven by the customOps string[] column

const ROLE_OPERATIONS: Record<Exclude<PermissionRole, 'CUSTOM'>, Operation[]> = {
  OWNER: [
    'canView', 'canDownload', 'canUpload', 'canEdit', 'canRename',
    'canMove', 'canCopy', 'canDelete', 'canRestore', 'canCompress',
    'canExtract', 'canShare', 'canManagePermissions',
  ],
  MANAGER: [
    'canView', 'canDownload', 'canUpload', 'canEdit', 'canRename',
    'canMove', 'canCopy', 'canDelete', 'canRestore', 'canCompress',
    'canExtract', 'canShare',
  ],
  EDITOR: [
    'canView', 'canDownload', 'canUpload', 'canEdit', 'canRename',
    'canMove', 'canCopy', 'canDelete', 'canCompress', 'canExtract',
  ],
  CONTRIBUTOR: [
    'canView', 'canDownload', 'canUpload', 'canCopy',
  ],
  VIEWER: [
    'canView', 'canDownload',
  ],
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Given a PermissionRole (and optional customOps), return the set of allowed operations.
 */
function resolveOps(role: PermissionRole, customOps: string[]): Set<Operation> {
  if (role === 'CUSTOM') {
    return new Set(customOps as Operation[]);
  }
  return new Set(ROLE_OPERATIONS[role] ?? []);
}

/**
 * Look up ALL ResourcePermission rows for a user on a given resource.
 * This includes:
 *   1. Direct user permission on the resource
 *   2. Permissions granted to any group the user belongs to
 *
 * Returns the union of all allowed operations (most-permissive wins).
 */
async function resolveUserOpsOnResource(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
): Promise<Set<Operation>> {
  const where: Prisma.ResourcePermissionWhereInput =
    resourceType === 'file'
      ? { fileId: resourceId }
      : { folderId: resourceId };

  // Fetch all permissions on this resource
  const permissions = await prisma.resourcePermission.findMany({
    where,
    include: {
      group: {
        include: { members: { where: { userId }, select: { userId: true } } },
      },
    },
  });

  const ops = new Set<Operation>();

  for (const perm of permissions) {
    const isDirectUser = perm.userId === userId;
    const isGroupMember =
      perm.groupId !== null &&
      perm.group !== null &&
      perm.group.members.length > 0;

    if (isDirectUser || isGroupMember) {
      const permOps = resolveOps(perm.role, perm.customOps);
      permOps.forEach((op) => ops.add(op));
    }
  }

  return ops;
}

/**
 * Walk the folder ancestor chain upward and collect the most-permissive
 * operation set inherited from any ancestor folder.
 *
 * Inheritance rule: if a user has a permission on a parent folder,
 * that permission propagates to all descendants unless overridden.
 */
async function resolveInheritedFolderOps(
  userId: string,
  folderId: string,
): Promise<Set<Operation>> {
  const inherited = new Set<Operation>();
  let currentId: string | null = folderId;

  while (currentId) {
    const ancestor: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!ancestor) break;

    currentId = ancestor.parentId;
    if (!currentId) break;

    const ancestorOps = await resolveUserOpsOnResource(userId, 'folder', currentId);
    ancestorOps.forEach((op) => inherited.add(op));
  }

  return inherited;
}

/**
 * Core resolution function.
 *
 * Resolution priority (highest wins):
 *   1. User is the resource OWNER  → all ops
 *   2. Direct ResourcePermission on the resource
 *   3. Group ResourcePermission on the resource
 *   4. Inherited from ancestor folders
 */
async function resolveEffectiveOps(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
): Promise<Set<Operation>> {
  // ── 1. Check ownership ───────────────────────────────────────────────────
  const isOwner =
    resourceType === 'file'
      ? !!(await prisma.file.findFirst({ where: { id: resourceId, ownerId: userId } }))
      : !!(await prisma.folder.findFirst({ where: { id: resourceId, ownerId: userId } }));

  if (isOwner) {
    return resolveOps('OWNER', []);
  }

  // ── 2 & 3. Direct + group permissions on the resource ───────────────────
  const directOps = await resolveUserOpsOnResource(userId, resourceType, resourceId);

  // ── 4. Inherited from ancestor folders ──────────────────────────────────
  // Only applies to folder → folder and file → its parent folder chain
  let inheritedOps = new Set<Operation>();

  if (resourceType === 'folder') {
    inheritedOps = await resolveInheritedFolderOps(userId, resourceId);
  } else {
    // For a file, walk its containing folder's ancestor chain
    const file = await prisma.file.findUnique({
      where: { id: resourceId },
      select: { folderId: true },
    });
    if (file?.folderId) {
      // First check the immediate parent folder
      const parentOps = await resolveUserOpsOnResource(userId, 'folder', file.folderId);
      parentOps.forEach((op) => inheritedOps.add(op));
      // Then walk up from the parent
      const ancestorOps = await resolveInheritedFolderOps(userId, file.folderId);
      ancestorOps.forEach((op) => inheritedOps.add(op));
    }
  }

  // Union of all sources (most-permissive)
  const effectiveOps = new Set<Operation>([...directOps, ...inheritedOps]);
  return effectiveOps;
}

// ─── PermissionService ────────────────────────────────────────────────────────

export class PermissionService {

  // ─── Permission check helpers ─────────────────────────────────────────────

  /**
   * Check whether a user can perform a specific operation on a resource.
   * Returns true/false. Throws nothing — callers decide how to respond.
   */
  static async can(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    operation: Operation,
  ): Promise<boolean> {
    const ops = await resolveEffectiveOps(userId, resourceType, resourceId);
    return ops.has(operation);
  }

  /**
   * Assert that a user can perform the operation — throws 403 if not.
   * Use this in service layer / controller to gate operations.
   */
  static async assert(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    operation: Operation,
  ): Promise<void> {
    const allowed = await PermissionService.can(userId, resourceType, resourceId, operation);
    if (!allowed) {
      throw new AppError(
        `You do not have permission to perform this action on this ${resourceType}`,
        403,
      );
    }
  }

  /**
   * Return the full effective permission summary for a user on a resource.
   * Useful for the client to know what actions to show/hide.
   */
  static async getEffective(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<Record<Operation, boolean>> {
    const ops = await resolveEffectiveOps(userId, resourceType, resourceId);

    const ALL_OPS: Operation[] = [
      'canView', 'canDownload', 'canUpload', 'canEdit', 'canRename',
      'canMove', 'canCopy', 'canDelete', 'canRestore', 'canCompress',
      'canExtract', 'canShare', 'canManagePermissions',
    ];

    return Object.fromEntries(ALL_OPS.map((op) => [op, ops.has(op)])) as Record<Operation, boolean>;
  }

  // ─── Named helpers (convenience wrappers around assert) ───────────────────

  static canView     = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canView');
  static canDownload = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canDownload');
  static canUpload   = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canUpload');
  static canEdit     = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canEdit');
  static canRename   = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canRename');
  static canMove     = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canMove');
  static canCopy     = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canCopy');
  static canDelete   = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canDelete');
  static canRestore  = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canRestore');
  static canShare    = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canShare');
  static canManagePermissions = (uid: string, type: ResourceType, id: string) => PermissionService.can(uid, type, id, 'canManagePermissions');

  // ─── Permission CRUD (grant / list / update / revoke) ────────────────────

  /**
   * Grant a permission on a resource to a user or group.
   * Only the resource owner or someone with canManagePermissions may do this.
   */
  static async grant(
    actorId: string,
    resourceType: ResourceType,
    resourceId: string,
    data: GrantPermissionInput,
  ) {
    // Assert actor has canManagePermissions on the resource
    await PermissionService.assert(actorId, resourceType, resourceId, 'canManagePermissions');

    // Validate target user/group exists
    if (data.userId) {
      const user = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) throw new AppError('Target user not found', 404);
      if (data.userId === actorId) throw new AppError('You already own this resource', 400);
    }

    if (data.groupId) {
      const group = await prisma.group.findUnique({ where: { id: data.groupId } });
      if (!group) throw new AppError('Target group not found', 404);
    }

    // Prevent duplicate — upsert by (resource, userId/groupId)
    const existing = await prisma.resourcePermission.findFirst({
      where: {
        ...(resourceType === 'file' ? { fileId: resourceId } : { folderId: resourceId }),
        ...(data.userId ? { userId: data.userId } : {}),
        ...(data.groupId ? { groupId: data.groupId } : {}),
      },
    });

    if (existing) {
      throw new AppError(
        'A permission for this user/group already exists on this resource. Use PATCH to update it.',
        409,
      );
    }

    const permission = await prisma.resourcePermission.create({
      data: {
        role: data.role as PermissionRole,
        customOps: data.customOps ?? [],
        ...(data.userId ? { userId: data.userId } : {}),
        ...(data.groupId ? { groupId: data.groupId } : {}),
        ...(resourceType === 'file' ? { fileId: resourceId } : { folderId: resourceId }),
      },
    });

    return formatPermission(permission);
  }

  /**
   * List all permissions on a resource.
   * Only visible to users with canManagePermissions.
   */
  static async list(
    actorId: string,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    await PermissionService.assert(actorId, resourceType, resourceId, 'canManagePermissions');

    const permissions = await prisma.resourcePermission.findMany({
      where:
        resourceType === 'file'
          ? { fileId: resourceId }
          : { folderId: resourceId },
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return permissions.map(formatPermission);
  }

  /**
   * Update the role or customOps of an existing permission.
   * Only the resource owner / someone with canManagePermissions may do this.
   */
  static async update(
    actorId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissionId: string,
    data: UpdatePermissionInput,
  ) {
    await PermissionService.assert(actorId, resourceType, resourceId, 'canManagePermissions');

    const permission = await prisma.resourcePermission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) throw new AppError('Permission not found', 404);

    // Ensure the permission actually belongs to this resource
    const belongsToResource =
      resourceType === 'file'
        ? permission.fileId === resourceId
        : permission.folderId === resourceId;

    if (!belongsToResource) throw new AppError('Permission not found', 404);

    const updated = await prisma.resourcePermission.update({
      where: { id: permissionId },
      data: {
        role: data.role as PermissionRole | undefined,
        customOps: data.customOps,
      },
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
        group: { select: { id: true, name: true } },
      },
    });

    return formatPermission(updated);
  }

  /**
   * Revoke (delete) a permission entry.
   * Only the resource owner / someone with canManagePermissions may do this.
   */
  static async revoke(
    actorId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissionId: string,
  ) {
    await PermissionService.assert(actorId, resourceType, resourceId, 'canManagePermissions');

    const permission = await prisma.resourcePermission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) throw new AppError('Permission not found', 404);

    const belongsToResource =
      resourceType === 'file'
        ? permission.fileId === resourceId
        : permission.folderId === resourceId;

    if (!belongsToResource) throw new AppError('Permission not found', 404);

    await prisma.resourcePermission.delete({ where: { id: permissionId } });

    return { permissionId };
  }

  /**
   * Get the effective permission summary for the calling user on a resource.
   * Safe to call for any authenticated user — returns their own capability map.
   */
  static async getMyPermissions(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    // Verify resource exists and is accessible (not trashed)
    if (resourceType === 'file') {
      const file = await prisma.file.findUnique({ where: { id: resourceId } });
      if (!file) throw new AppError('File not found', 404);
      if (file.isTrashed) throw new AppError('File is in the trash', 410);
    } else {
      const folder = await prisma.folder.findUnique({ where: { id: resourceId } });
      if (!folder) throw new AppError('Folder not found', 404);
      if (folder.isTrashed) throw new AppError('Folder is in the trash', 410);
    }

    return PermissionService.getEffective(userId, resourceType, resourceId);
  }
}

// ─── Formatter ────────────────────────────────────────────────────────────────

function formatPermission(perm: {
  id: string;
  role: PermissionRole;
  customOps: string[];
  userId: string | null;
  groupId: string | null;
  fileId: string | null;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; name: string | null; email: string; username: string } | null;
  group?: { id: string; name: string } | null;
}) {
  return {
    id: perm.id,
    role: perm.role,
    customOps: perm.customOps,
    userId: perm.userId,
    groupId: perm.groupId,
    fileId: perm.fileId,
    folderId: perm.folderId,
    createdAt: perm.createdAt.toISOString(),
    updatedAt: perm.updatedAt.toISOString(),
    ...(perm.user !== undefined && { user: perm.user }),
    ...(perm.group !== undefined && { group: perm.group }),
  };
}
