import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { CreateInvitationInput } from '../validations/invitation.validation';
import { PermissionService } from './permission.service';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatInvitation(invitation: {
  id: string;
  folderId: string | null;
  fileId: string | null;
  inviteeEmail: string;
  role: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  invitedBy: { id: string; name: string | null; email: string; username: string; avatar: string | null };
  invitee?: { id: string; name: string | null; email: string; username: string; avatar: string | null } | null;
  file?: { id: string; name: string; mimeType: string; size: bigint } | null;
  folder?: { id: string; name: string } | null;
}) {
  const base = {
    id: invitation.id,
    folderId: invitation.folderId,
    fileId: invitation.fileId,
    inviteeEmail: invitation.inviteeEmail,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    invitedBy: {
      id: invitation.invitedBy.id,
      name: invitation.invitedBy.name,
      email: invitation.invitedBy.email,
      username: invitation.invitedBy.username,
      avatar: invitation.invitedBy.avatar,
    },
  };

  const result: any = { ...base };

  if (invitation.invitee) {
    result.invitee = {
      id: invitation.invitee.id,
      name: invitation.invitee.name,
      email: invitation.invitee.email,
      username: invitation.invitee.username,
      avatar: invitation.invitee.avatar,
    };
  }

  if (invitation.file) {
    result.file = {
      id: invitation.file.id,
      name: invitation.file.name,
      mimeType: invitation.file.mimeType,
      size: invitation.file.size.toString(),
    };
  }

  if (invitation.folder) {
    result.folder = {
      id: invitation.folder.id,
      name: invitation.folder.name,
    };
  }

  return result;
}

// ─── InvitationService ────────────────────────────────────────────────────────

export class InvitationService {
  /**
   * Create an invitation for a resource (file or folder) via email.
   * The actor must have canShare permission on the resource.
   * If the invitee already has a user account, link it immediately.
   */
  static async invite(actorId: string, data: CreateInvitationInput) {
    const { fileId, folderId, inviteeEmail, role, expiresAt } = data;

    // Validate exactly one resource is specified
    if ((fileId && folderId) || (!fileId && !folderId)) {
      throw new AppError('Specify exactly one of fileId or folderId', 400);
    }

    // Get actor email
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new AppError('Actor not found', 404);

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

    // Check if invitee already has an account
    const inviteeUser = await prisma.user.findUnique({ where: { email: inviteeEmail } });

    // Prevent inviting self
    if (inviteeUser && inviteeUser.id === actorId) {
      throw new AppError('You cannot invite yourself', 400);
    }

    // Check for duplicate pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        ...(fileId ? { fileId } : { folderId }),
        inviteeEmail,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new AppError('A pending invitation already exists for this email and resource', 409);
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        ...(fileId ? { fileId } : { folderId }),
        invitedById: actorId,
        inviteeId: inviteeUser?.id ?? null,
        inviteeEmail,
        role,
        status: 'PENDING',
        expiresAt: expiresAt ?? null,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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
        action: 'INVITE',
        details: JSON.stringify({
          invitationId: invitation.id,
          fileId,
          folderId,
          inviteeEmail,
          role,
        }),
      },
    });

    // TODO: Send invitation email (integrate email service in a future phase)

    return formatInvitation(invitation);
  }

  /**
   * List all invitations I have sent.
   */
  static async listSent(actorId: string) {
    const invitations = await prisma.invitation.findMany({
      where: { invitedById: actorId },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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

    return invitations.map(formatInvitation);
  }

  /**
   * List all invitations sent to me (matching my email).
   */
  static async listReceived(actorId: string) {
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new AppError('User not found', 404);

    const invitations = await prisma.invitation.findMany({
      where: {
        inviteeEmail: actor.email,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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

    return invitations.map(formatInvitation);
  }

  /**
   * Accept an invitation.
   * The invitation must be PENDING and match the actor's email.
   * Grants permission and updates status to ACCEPTED.
   */
  static async accept(actorId: string, invitationId: string) {
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new AppError('User not found', 404);

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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

    if (!invitation) throw new AppError('Invitation not found', 404);

    if (invitation.inviteeEmail !== actor.email) {
      throw new AppError('This invitation is not for you', 403);
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError('Invitation has already been processed', 400);
    }

    // Check if invitation expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('Invitation has expired', 400);
    }

    // Grant permission via ResourcePermission
    await prisma.resourcePermission.create({
      data: {
        ...(invitation.fileId ? { fileId: invitation.fileId } : { folderId: invitation.folderId }),
        userId: actorId,
        role: invitation.role,
        customOps: [],
      },
    });

    // Update invitation status
    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        inviteeId: actorId,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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
        action: 'ACCEPT_INVITATION',
        details: JSON.stringify({
          invitationId,
          fileId: invitation.fileId,
          folderId: invitation.folderId,
        }),
      },
    });

    return formatInvitation(updated);
  }

  /**
   * Decline an invitation.
   * The invitation must be PENDING and match the actor's email.
   * Updates status to DECLINED.
   */
  static async decline(actorId: string, invitationId: string) {
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new AppError('User not found', 404);

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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

    if (!invitation) throw new AppError('Invitation not found', 404);

    if (invitation.inviteeEmail !== actor.email) {
      throw new AppError('This invitation is not for you', 403);
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError('Invitation has already been processed', 400);
    }

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED',
        inviteeId: actorId,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        invitee: {
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

    return formatInvitation(updated);
  }

  /**
   * Cancel an invitation (inviter only).
   * The invitation must be PENDING and the actor must be the inviter.
   * Deletes the invitation record.
   */
  static async cancel(actorId: string, invitationId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) throw new AppError('Invitation not found', 404);

    if (invitation.invitedById !== actorId) {
      throw new AppError('Only the inviter can cancel this invitation', 403);
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError('Only pending invitations can be cancelled', 400);
    }

    await prisma.invitation.delete({ where: { id: invitationId } });

    return { invitationId };
  }
}
