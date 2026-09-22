import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  CreateGroupInput,
  UpdateGroupInput,
  AddMemberInput,
  UpdateMemberRoleInput,
} from '../validations/group.validation';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatGroup(group: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { members: number };
}) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    ...(group._count !== undefined && { memberCount: group._count.members }),
  };
}

function formatMember(member: {
  id: string;
  role: string;
  createdAt: Date;
  user: { id: string; name: string | null; email: string; username: string; avatar: string | null };
}) {
  return {
    id: member.id,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      username: member.user.username,
      avatar: member.user.avatar,
    },
  };
}

// ─── GroupService ─────────────────────────────────────────────────────────────

export class GroupService {
  /**
   * Create a new group. The creator is automatically added as an ADMIN member.
   */
  static async create(creatorId: string, data: CreateGroupInput) {
    // Validate name uniqueness
    const existing = await prisma.group.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new AppError('Group name is already taken', 409);
    }

    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        members: {
          create: {
            userId: creatorId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    await prisma.activity.create({
      data: {
        userId: creatorId,
        action: 'CREATE_GROUP',
        details: JSON.stringify({ groupId: group.id, name: group.name }),
      },
    });

    return formatGroup(group);
  }

  /**
   * List all groups the user is a member of.
   */
  static async list(userId: string) {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...formatGroup(m.group),
      myRole: m.role,
    }));
  }

  /**
   * Get a single group by ID.
   * Only members of the group can view it.
   */
  static async getById(actorId: string, groupId: string) {
    const membership = await prisma.groupMember.findFirst({
      where: { userId: actorId, groupId },
    });

    if (!membership) {
      throw new AppError('Group not found or you are not a member', 404);
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });

    if (!group) throw new AppError('Group not found', 404);

    return {
      ...formatGroup(group),
      myRole: membership.role,
      members: group.members.map(formatMember),
    };
  }

  /**
   * Update group name or description.
   * Only ADMIN members can do this.
   */
  static async update(actorId: string, groupId: string, data: UpdateGroupInput) {
    await GroupService.assertAdmin(actorId, groupId);

    // Validate name uniqueness if changing
    if (data.name) {
      const existing = await prisma.group.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== groupId) {
        throw new AppError('Group name is already taken', 409);
      }
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return formatGroup(updated);
  }

  /**
   * Delete a group.
   * Only ADMIN members can delete.
   * Deleting a group also removes all ResourcePermissions granted to it.
   */
  static async delete(actorId: string, groupId: string) {
    await GroupService.assertAdmin(actorId, groupId);

    await prisma.group.delete({ where: { id: groupId } });

    return { groupId };
  }

  /**
   * Add a member to a group.
   * Only ADMIN members can add.
   * The new member's role defaults to MEMBER.
   */
  static async addMember(actorId: string, groupId: string, data: AddMemberInput) {
    await GroupService.assertAdmin(actorId, groupId);

    // Validate target user exists
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new AppError('Target user not found', 404);

    // Prevent duplicate
    const existing = await prisma.groupMember.findFirst({
      where: { userId: data.userId, groupId },
    });
    if (existing) {
      throw new AppError('User is already a member of this group', 409);
    }

    const member = await prisma.groupMember.create({
      data: {
        userId: data.userId,
        groupId,
        role: data.role ?? 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return formatMember(member);
  }

  /**
   * Remove a member from a group.
   * Only ADMIN members can remove others.
   * Members can remove themselves (leave the group).
   * Cannot remove the last ADMIN.
   */
  static async removeMember(actorId: string, groupId: string, memberId: string) {
    const actorMembership = await prisma.groupMember.findFirst({
      where: { userId: actorId, groupId },
    });

    if (!actorMembership) {
      throw new AppError('Group not found or you are not a member', 404);
    }

    const targetMembership = await prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.groupId !== groupId) {
      throw new AppError('Member not found in this group', 404);
    }

    // Self-removal always allowed
    const isSelf = targetMembership.userId === actorId;

    if (!isSelf && actorMembership.role !== 'ADMIN') {
      throw new AppError('Only admins can remove other members', 403);
    }

    // Prevent removing the last admin
    if (targetMembership.role === 'ADMIN') {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new AppError(
          'Cannot remove the last admin. Promote another member first',
          400,
        );
      }
    }

    await prisma.groupMember.delete({ where: { id: memberId } });

    return { memberId };
  }

  /**
   * Update a member's role (ADMIN ↔ MEMBER).
   * Only ADMIN members can change roles.
   * Cannot demote the last ADMIN.
   */
  static async updateMemberRole(
    actorId: string,
    groupId: string,
    memberId: string,
    data: UpdateMemberRoleInput,
  ) {
    await GroupService.assertAdmin(actorId, groupId);

    const targetMembership = await prisma.groupMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!targetMembership || targetMembership.groupId !== groupId) {
      throw new AppError('Member not found in this group', 404);
    }

    // Prevent demoting the last admin
    if (targetMembership.role === 'ADMIN' && data.role !== 'ADMIN') {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new AppError('Cannot demote the last admin', 400);
      }
    }

    const updated = await prisma.groupMember.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return formatMember(updated);
  }

  // ─── Internal helper ──────────────────────────────────────────────────────

  /**
   * Assert that the actor is an ADMIN of the given group.
   * Throws 404 if not a member, 403 if not an admin.
   */
  private static async assertAdmin(userId: string, groupId: string): Promise<void> {
    const membership = await prisma.groupMember.findFirst({
      where: { userId, groupId },
    });

    if (!membership) {
      throw new AppError('Group not found or you are not a member', 404);
    }

    if (membership.role !== 'ADMIN') {
      throw new AppError('Only group admins can perform this action', 403);
    }
  }
}
