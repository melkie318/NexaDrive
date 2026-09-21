import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { Visibility } from '@prisma/client';
import {
  CreateFolderInput,
  RenameFolderInput,
  MoveFolderInput,
  ListFoldersQuery,
} from '../validations/folder.validation';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function formatFolder(folder: {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  visibility: Visibility;
  isTrashed: boolean;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { subfolders: number; files: number };
}) {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    ownerId: folder.ownerId,
    visibility: folder.visibility,
    isTrashed: folder.isTrashed,
    trashedAt: folder.trashedAt?.toISOString() ?? null,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    ...(folder._count !== undefined && {
      subfolderCount: folder._count.subfolders,
      fileCount: folder._count.files,
    }),
  };
}

/**
 * Builds the full path string for a folder by walking up the ancestor chain.
 * Used for storing originalPath in TrashItem so restore knows where to put it back.
 * e.g. "My Drive / Documents / University"
 */
async function buildFolderPath(folderId: string): Promise<string> {
  const parts: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const ancestor: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
    if (!ancestor) break;
    parts.unshift(ancestor.name);
    currentId = ancestor.parentId;
  }

  return `My Drive / ${parts.join(' / ')}`;
}

/**
 * Collects all descendant folder IDs (recursive) of a given folder.
 * Used to prevent circular moves and to bulk-trash entire subtrees.
 */
async function getDescendantIds(folderId: string): Promise<string[]> {
  const ids: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await prisma.folder.findMany({
      where: { parentId: current, isTrashed: false },
      select: { id: true },
    });
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
}

// ─── FolderService ────────────────────────────────────────────────────────────

export class FolderService {
  /**
   * Create a new folder.
   * If parentId is provided, the parent must exist and be owned by the same user.
   */
  static async createFolder(userId: string, data: CreateFolderInput) {
    // Validate parent ownership if provided
    if (data.parentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: data.parentId },
        select: { id: true, ownerId: true, isTrashed: true },
      });

      if (!parent || parent.ownerId !== userId) {
        throw new AppError('Parent folder not found', 404);
      }
      if (parent.isTrashed) {
        throw new AppError('Cannot create a folder inside a trashed folder', 400);
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        ownerId: userId,
        visibility: data.visibility as Visibility,
      },
      include: { _count: { select: { subfolders: true, files: true } } },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'CREATE_FOLDER',
        details: JSON.stringify({ folderId: folder.id, name: folder.name, parentId: folder.parentId }),
      },
    });

    return formatFolder(folder);
  }

  /**
   * List folders owned by the user at a given level.
   * Omitting parentId returns root-level folders (parentId IS NULL).
   * Only non-trashed folders are returned.
   */
  static async listFolders(userId: string, query: ListFoldersQuery) {
    const { parentId, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where = {
      ownerId: userId,
      isTrashed: false,
      // When parentId is provided, filter by it; otherwise list roots (null)
      parentId: parentId ?? null,
    };

    const [folders, total] = await Promise.all([
      prisma.folder.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: { _count: { select: { subfolders: true, files: true } } },
      }),
      prisma.folder.count({ where }),
    ]);

    return {
      folders: folders.map(formatFolder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single folder by ID.
   * Also returns its immediate subfolders and the breadcrumb path to root.
   */
  static async getFolderById(userId: string, folderId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        subfolders: {
          where: { isTrashed: false },
          orderBy: { name: 'asc' },
          include: { _count: { select: { subfolders: true, files: true } } },
        },
        _count: { select: { subfolders: true, files: true } },
      },
    });

    if (!folder || folder.ownerId !== userId) {
      throw new AppError('Folder not found', 404);
    }

    if (folder.isTrashed) {
      throw new AppError('Folder is in the trash', 410);
    }

    // Build breadcrumb: walk up to root
    const breadcrumb: { id: string; name: string }[] = [];
    let currentId: string | null = folder.parentId;

    while (currentId) {
      const ancestor = await prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
      if (!ancestor) break;
      breadcrumb.unshift({ id: ancestor.id, name: ancestor.name });
      currentId = ancestor.parentId;
    }

    return {
      ...formatFolder(folder),
      subfolders: folder.subfolders.map(formatFolder),
      breadcrumb, // [{id, name}, ...] from root to immediate parent
    };
  }

  /**
   * Rename a folder.
   * Only the owner can rename.
   */
  static async renameFolder(userId: string, folderId: string, data: RenameFolderInput) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, ownerId: true, isTrashed: true, name: true },
    });

    if (!folder || folder.ownerId !== userId) {
      throw new AppError('Folder not found', 404);
    }
    if (folder.isTrashed) {
      throw new AppError('Cannot rename a trashed folder', 400);
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { name: data.name },
      include: { _count: { select: { subfolders: true, files: true } } },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'RENAME',
        details: JSON.stringify({ folderId, oldName: folder.name, newName: data.name }),
      },
    });

    return formatFolder(updated);
  }

  /**
   * Move a folder to a different parent (or to root when parentId is null).
   * Guards against:
   *   - Moving a folder into itself
   *   - Moving a folder into one of its own descendants (circular reference)
   *   - Moving a trashed folder
   */
  static async moveFolder(userId: string, folderId: string, data: MoveFolderInput) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, ownerId: true, isTrashed: true, parentId: true, name: true },
    });

    if (!folder || folder.ownerId !== userId) {
      throw new AppError('Folder not found', 404);
    }
    if (folder.isTrashed) {
      throw new AppError('Cannot move a trashed folder', 400);
    }

    const targetParentId = data.parentId; // null = root

    // No-op: already at the desired location
    if (targetParentId === folder.parentId) {
      return formatFolder({
        ...folder,
        visibility: 'PRIVATE' as Visibility, // won't be used; re-fetched below
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      });
    }

    if (targetParentId !== null) {
      // Cannot move into itself
      if (targetParentId === folderId) {
        throw new AppError('Cannot move a folder into itself', 400);
      }

      // Cannot move into a descendant (circular reference check)
      const descendantIds = await getDescendantIds(folderId);
      if (descendantIds.includes(targetParentId)) {
        throw new AppError('Cannot move a folder into one of its own subfolders', 400);
      }

      // Validate target parent exists and is owned by same user
      const targetParent = await prisma.folder.findUnique({
        where: { id: targetParentId },
        select: { id: true, ownerId: true, isTrashed: true },
      });

      if (!targetParent || targetParent.ownerId !== userId) {
        throw new AppError('Destination folder not found', 404);
      }
      if (targetParent.isTrashed) {
        throw new AppError('Cannot move a folder into a trashed folder', 400);
      }
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { parentId: targetParentId },
      include: { _count: { select: { subfolders: true, files: true } } },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'MOVE',
        details: JSON.stringify({
          folderId,
          name: folder.name,
          fromParentId: folder.parentId,
          toParentId: targetParentId,
        }),
      },
    });

    return formatFolder(updated);
  }

  /**
   * Soft-delete a folder (move to trash).
   * Marks the folder and all its descendants as trashed.
   * Creates a TrashItem with the original path so it can be restored.
   */
  static async deleteFolder(userId: string, folderId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, ownerId: true, isTrashed: true, name: true, parentId: true },
    });

    if (!folder || folder.ownerId !== userId) {
      throw new AppError('Folder not found', 404);
    }
    if (folder.isTrashed) {
      throw new AppError('Folder is already in the trash', 400);
    }

    const originalPath = await buildFolderPath(folderId);
    const now = new Date();

    // Collect all descendant IDs so we can bulk-trash the entire subtree
    const descendantIds = await getDescendantIds(folderId);
    const allFolderIds = [folderId, ...descendantIds];

    await prisma.$transaction(async (tx) => {
      // Soft-delete the folder and all descendants
      await tx.folder.updateMany({
        where: { id: { in: allFolderIds } },
        data: { isTrashed: true, trashedAt: now },
      });

      // Create a TrashItem only for the top-level folder being trashed
      // (descendants are implicitly trashed along with their root)
      await tx.trashItem.create({
        data: {
          folderId,
          originalPath,
        },
      });
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'DELETE',
        details: JSON.stringify({ folderId, name: folder.name, originalPath }),
      },
    });

    return { folderId, trashedAt: now.toISOString() };
  }
}
