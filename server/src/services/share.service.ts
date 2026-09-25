import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  CreateDirectShareInput,
  CreateGroupShareInput,
} from '../validations/share.validation';
import { PermissionService } from './permission.service';
import { SocketService } from './socket.service';
import { ResourceSharedPayload } from '../types/socket.types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatShare(share: {
  id: string;
  folderId: string | null;
  fileId: string | null;
  role: string;
  createdAt: Date;
  createdBy: { id: string; name: string | null; email: string; username: string; avatar: string | null };
  sharedWith?: { id: string; name: string | null; email: string; username: string; avatar: string | null } | null;
  group?: { id: string; name: string; description: string | null } | null;
  file?: { id: string; name: string; mimeType: string; size: bigint } | null;
  folder?: { id: string; name: string } | null;
}) {
  const base = {
    id: share.id,
    folderId: share.folderId,
    fileId: share.fileId,
    role: share.role,
    createdAt: share.createdAt.toISOString(),
    createdBy: {
      id: share.createdBy.id,
      name: share.createdBy.name,
      email: share.createdBy.email,
      username: share.createdBy.username,
      avatar: share.createdBy.avatar,
    },
  };

  const result: any = { ...base };

  if (share.sharedWith) {
    result.sharedWith = {
      id: share.sharedWith.id,
      name: share.sharedWith.name,
      email: share.sharedWith.email,
      username: share.sharedWith.username,
      avatar: share.sharedWith.avatar,
    };
  }

  if (share.group) {
    result.group = {
      id: share.group.id,
      name: share.group.name,
      description: share.group.description,
    };
  }

  if (share.file) {
    result.file = {
      id: share.file.id,
      name: share.file.name,
      mimeType: share.file.mimeType,
      size: share.file.size.toString(),
    };
  }

  if (share.folder) {
    result.folder = {
      id: share.folder.id,
      name: share.folder.name,
    };
  }

  return result;
}

// ─── ShareService ─────────────────────────────────────────────────────────────

export class ShareService {
  /**
   * Create a direct share: shares a file or folder with a specific user.
   * The actor must have canShare permission on the resource.
   * Creates a ResourcePermission and logs a Share record.
   */
  static async createDirectShare(actorId: string, data: CreateDirectShareInput) {
    const { fileId, folderId, targetUserId, role } = data;

    // Validate exactly one resource is specified
    if ((fileId && folderId) || (!fileId && !folderId)) {
      throw new AppError('Specify exactly one of fileId or folderId', 400);
    }

    // Validate resource exists and actor has canShare permission
    if (fileId) {
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw new AppError('File not found', 404);

      const canShare = await PermissionService.canShare(actorId, 'file', fileId);
      if (!canShare) {
        throw new AppError('You do not have permission to share this file', 403);
      }
    } else if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) throw new AppError('Folder not found', 404);

      const canShare = await PermissionService.canShare(actorId, 'folder', folderId);
      if (!canShare) {
        throw new AppError('You do not have permission to share this folder', 403);
      }
    }

    // Validate target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new AppError('Target user not found', 404);

    // Prevent sharing with self
    if (targetUserId === actorId) {
      throw new AppError('You cannot share with yourself', 400);
    }

    // Check for duplicate share
    const existing = await prisma.share.findFirst({
      where: {
        ...(fileId ? { fileId } : { folderId }),
        sharedWithId: targetUserId,
        groupId: null,
      },
    });

    if (existing) {
      throw new AppError('You have already shared this resource with this user', 409);
    }

    // Grant permission via ResourcePermission
    await prisma.resourcePermission.create({
      data: {
        ...(fileId ? { fileId } : { folderId }),
        userId: targetUserId,
        role,
        customOps: [],
      },
    });

    // Log the share
    const share = await prisma.share.create({
      data: {
        ...(fileId ? { fileId } : { folderId }),
        createdById: actorId,
        sharedWithId: targetUserId,
        role,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'SHARE_RESOURCE',
        details: JSON.stringify({
          shareId: share.id,
          fileId,
          folderId,
          targetUserId,
          role,
        }),
      },
    });

    // Emit real-time Socket event to recipient
    if (share.sharedWith) {
      const socketPayload: ResourceSharedPayload = {
        shareId: share.id,
        resourceType: fileId ? 'file' : 'folder',
        resourceId: (fileId || folderId) as string,
        resourceName: share.file?.name || share.folder?.name || 'Unknown',
        sharedWith: {
          id: share.sharedWith.id,
          email: share.sharedWith.email,
          username: share.sharedWith.username,
        },
        permission: role,
        sharedBy: {
          id: share.createdBy.id,
          username: share.createdBy.username,
        },
        timestamp: share.createdAt,
      };
      SocketService.emitResourceShared(targetUserId, socketPayload);
    }

    return formatShare(share);
  }

  /**
   * Create a group share: shares a file or folder with an entire group.
   * The actor must have canShare permission on the resource.
   */
  static async createGroupShare(actorId: string, data: CreateGroupShareInput) {
    const { fileId, folderId, targetGroupId, role } = data;

    // Validate exactly one resource is specified
    if ((fileId && folderId) || (!fileId && !folderId)) {
      throw new AppError('Specify exactly one of fileId or folderId', 400);
    }

    // Validate resource exists and actor has canShare permission
    if (fileId) {
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw new AppError('File not found', 404);

      const canShare = await PermissionService.canShare(actorId, 'file', fileId);
      if (!canShare) {
        throw new AppError('You do not have permission to share this file', 403);
      }
    } else if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) throw new AppError('Folder not found', 404);

      const canShare = await PermissionService.canShare(actorId, 'folder', folderId);
      if (!canShare) {
        throw new AppError('You do not have permission to share this folder', 403);
      }
    }

    // Validate target group exists
    const targetGroup = await prisma.group.findUnique({ where: { id: targetGroupId } });
    if (!targetGroup) throw new AppError('Target group not found', 404);

    // Check for duplicate group share
    const existing = await prisma.share.findFirst({
      where: {
        ...(fileId ? { fileId } : { folderId }),
        groupId: targetGroupId,
      },
    });

    if (existing) {
      throw new AppError('This resource is already shared with this group', 409);
    }

    // Grant permission via ResourcePermission
    await prisma.resourcePermission.create({
      data: {
        ...(fileId ? { fileId } : { folderId }),
        groupId: targetGroupId,
        role,
        customOps: [],
      },
    });

    // Log the share
    const share = await prisma.share.create({
      data: {
        ...(fileId ? { fileId } : { folderId }),
        createdById: actorId,
        groupId: targetGroupId,
        role,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'SHARE_RESOURCE',
        details: JSON.stringify({
          shareId: share.id,
          fileId,
          folderId,
          targetGroupId,
          role,
        }),
      },
    });

    return formatShare(share);
  }

  /**
   * List all shares I have created (resources I shared with others).
   */
  static async listMyShares(actorId: string) {
    const shares = await prisma.share.findMany({
      where: { createdById: actorId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map(formatShare);
  }

  /**
   * List all shares that others have shared with me (direct shares only, not group shares).
   */
  static async listSharedWithMe(actorId: string) {
    const shares = await prisma.share.findMany({
      where: {
        sharedWithId: actorId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map(formatShare);
  }

  /**
   * Revoke a share (removes the permission and deletes the Share record).
   * Only the original sharer or resource owner can revoke.
   */
  static async revoke(actorId: string, shareId: string) {
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        file: { select: { ownerId: true } },
        folder: { select: { ownerId: true } },
      },
    });

    if (!share) throw new AppError('Share not found', 404);

    // Determine owner
    const ownerId = share.fileId
      ? share.file?.ownerId
      : share.folderId
        ? share.folder?.ownerId
        : null;

    // Only sharer or owner can revoke
    if (share.createdById !== actorId && ownerId !== actorId) {
      throw new AppError('You do not have permission to revoke this share', 403);
    }

    // Delete the corresponding permission
    await prisma.resourcePermission.deleteMany({
      where: {
        ...(share.fileId ? { fileId: share.fileId } : { folderId: share.folderId }),
        ...(share.sharedWithId ? { userId: share.sharedWithId } : { groupId: share.groupId }),
      },
    });

    // Delete the share record
    await prisma.share.delete({ where: { id: shareId } });

    return { shareId };
  }
}
