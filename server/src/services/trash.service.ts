import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { QuotaService } from './storage/quota.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRASH_RETENTION_DAYS = 30;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatTrashItem(item: {
  id: string;
  folderId: string | null;
  fileId: string | null;
  originalPath: string;
  deletedAt: Date;
  file?: {
    id: string;
    name: string;
    size: bigint;
    mimeType: string;
    ownerId: string;
  } | null;
  folder?: {
    id: string;
    name: string;
    ownerId: string;
  } | null;
}) {
  const base = {
    id: item.id,
    originalPath: item.originalPath,
    deletedAt: item.deletedAt.toISOString(),
    expiresAt: new Date(
      item.deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };

  if (item.file) {
    return {
      ...base,
      type: 'file' as const,
      resource: {
        id: item.file.id,
        name: item.file.name,
        size: item.file.size.toString(),
        mimeType: item.file.mimeType,
        ownerId: item.file.ownerId,
      },
    };
  }

  if (item.folder) {
    return {
      ...base,
      type: 'folder' as const,
      resource: {
        id: item.folder.id,
        name: item.folder.name,
        ownerId: item.folder.ownerId,
      },
    };
  }

  return base;
}

// ─── TrashService ─────────────────────────────────────────────────────────────

export class TrashService {
  /**
   * Move a file to trash (soft delete).
   * Sets isTrashed=true, trashedAt=now, and creates a TrashItem record.
   */
  static async moveFileToTrash(actorId: string, fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        folder: { select: { name: true } },
      },
    });

    if (!file) throw new AppError('File not found', 404);

    // Only owner can trash (or user with canDelete permission - checked by controller)
    if (file.ownerId !== actorId) {
      throw new AppError('Only the owner can move this file to trash', 403);
    }

    if (file.isTrashed) {
      throw new AppError('File is already in trash', 400);
    }

    // Construct original path
    const originalPath = file.folder ? `/${file.folder.name}/${file.name}` : `/${file.name}`;

    // Update file
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: {
        isTrashed: true,
        trashedAt: new Date(),
      },
    });

    // Create trash item
    const trashItem = await prisma.trashItem.create({
      data: {
        fileId,
        originalPath,
      },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            size: true,
            mimeType: true,
            ownerId: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'MOVE_TO_TRASH',
        details: JSON.stringify({ fileId, fileName: file.name }),
      },
    });

    return formatTrashItem(trashItem);
  }

  /**
   * Move a folder to trash (soft delete).
   * Recursively marks the folder and all descendants as trashed.
   */
  static async moveFolderToTrash(actorId: string, folderId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        parent: { select: { name: true } },
      },
    });

    if (!folder) throw new AppError('Folder not found', 404);

    // Only owner can trash
    if (folder.ownerId !== actorId) {
      throw new AppError('Only the owner can move this folder to trash', 403);
    }

    if (folder.isTrashed) {
      throw new AppError('Folder is already in trash', 400);
    }

    // Construct original path
    const originalPath = folder.parent
      ? `/${folder.parent.name}/${folder.name}`
      : `/${folder.name}`;

    // Recursively mark folder and all descendants as trashed
    await TrashService.markFolderTreeTrashed(folderId, new Date());

    // Create trash item (only for the top-level folder)
    const trashItem = await prisma.trashItem.create({
      data: {
        folderId,
        originalPath,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'MOVE_TO_TRASH',
        details: JSON.stringify({ folderId, folderName: folder.name }),
      },
    });

    return formatTrashItem(trashItem);
  }

  /**
   * List all trash items for the current user.
   */
  static async listTrash(userId: string) {
    const trashItems = await prisma.trashItem.findMany({
      where: {
        OR: [
          { file: { ownerId: userId } },
          { folder: { ownerId: userId } },
        ],
      },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            size: true,
            mimeType: true,
            ownerId: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return trashItems.map(formatTrashItem);
  }

  /**
   * Restore a file from trash.
   * Sets isTrashed=false, trashedAt=null, and removes TrashItem record.
   */
  static async restoreFile(actorId: string, trashItemId: string) {
    const trashItem = await prisma.trashItem.findUnique({
      where: { id: trashItemId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!trashItem || !trashItem.file) {
      throw new AppError('Trash item not found or is not a file', 404);
    }

    // Only owner can restore
    if (trashItem.file.ownerId !== actorId) {
      throw new AppError('Only the owner can restore this file', 403);
    }

    // Restore file
    await prisma.file.update({
      where: { id: trashItem.fileId! },
      data: {
        isTrashed: false,
        trashedAt: null,
      },
    });

    // Delete trash item
    await prisma.trashItem.delete({
      where: { id: trashItemId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'RESTORE',
        details: JSON.stringify({ fileId: trashItem.fileId, fileName: trashItem.file.name }),
      },
    });

    return { trashItemId, fileId: trashItem.fileId };
  }

  /**
   * Restore a folder from trash.
   * Recursively restores the folder and all descendants.
   */
  static async restoreFolder(actorId: string, trashItemId: string) {
    const trashItem = await prisma.trashItem.findUnique({
      where: { id: trashItemId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!trashItem || !trashItem.folder) {
      throw new AppError('Trash item not found or is not a folder', 404);
    }

    // Only owner can restore
    if (trashItem.folder.ownerId !== actorId) {
      throw new AppError('Only the owner can restore this folder', 403);
    }

    // Recursively restore folder and all descendants
    await TrashService.markFolderTreeRestored(trashItem.folderId!);

    // Delete trash item
    await prisma.trashItem.delete({
      where: { id: trashItemId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'RESTORE',
        details: JSON.stringify({
          folderId: trashItem.folderId,
          folderName: trashItem.folder.name,
        }),
      },
    });

    return { trashItemId, folderId: trashItem.folderId };
  }

  /**
   * Permanently delete a file from trash.
   * Deletes the physical file and all database records.
   * Decrements the user's storage quota.
   */
  static async permanentDeleteFile(actorId: string, trashItemId: string) {
    const trashItem = await prisma.trashItem.findUnique({
      where: { id: trashItemId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            size: true,
            storagePath: true,
            ownerId: true,
          },
        },
      },
    });

    if (!trashItem || !trashItem.file) {
      throw new AppError('Trash item not found or is not a file', 404);
    }

    // Only owner can permanently delete
    if (trashItem.file.ownerId !== actorId) {
      throw new AppError('Only the owner can permanently delete this file', 403);
    }

    const fileSize = trashItem.file.size;
    const fileId = trashItem.file.id;

    // Delete physical file (handled by storage provider)
    const fs = await import('fs/promises');
    try {
      await fs.unlink(trashItem.file.storagePath);
    } catch (err) {
      // File might already be deleted; log but don't fail
      console.error(`Failed to delete physical file: ${trashItem.file.storagePath}`, err);
    }

    // Delete trash item (cascade deletes file record)
    await prisma.trashItem.delete({
      where: { id: trashItemId },
    });

    // Delete file record
    await prisma.file.delete({
      where: { id: fileId },
    });

    // Decrement quota
    await QuotaService.decrement(actorId, fileSize);

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'PERMANENT_DELETE',
        details: JSON.stringify({ fileId, fileName: trashItem.file.name }),
      },
    });

    return { trashItemId, fileId };
  }

  /**
   * Permanently delete a folder from trash.
   * Recursively deletes all files and subfolders.
   * Decrements the user's storage quota for all deleted files.
   */
  static async permanentDeleteFolder(actorId: string, trashItemId: string) {
    const trashItem = await prisma.trashItem.findUnique({
      where: { id: trashItemId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!trashItem || !trashItem.folder) {
      throw new AppError('Trash item not found or is not a folder', 404);
    }

    // Only owner can permanently delete
    if (trashItem.folder.ownerId !== actorId) {
      throw new AppError('Only the owner can permanently delete this folder', 403);
    }

    const folderId = trashItem.folderId!;

    // Calculate total size of all files in folder tree
    const files = await TrashService.getAllFilesInFolderTree(folderId);
    const totalSize = files.reduce((sum, f) => sum + BigInt(f.size), BigInt(0));

    // Delete all physical files
    const fs = await import('fs/promises');
    for (const file of files) {
      try {
        await fs.unlink(file.storagePath);
      } catch (err) {
        console.error(`Failed to delete physical file: ${file.storagePath}`, err);
      }
    }

    // Delete trash item
    await prisma.trashItem.delete({
      where: { id: trashItemId },
    });

    // Delete folder (cascade deletes all subfolders and files)
    await prisma.folder.delete({
      where: { id: folderId },
    });

    // Decrement quota
    if (totalSize > 0) {
      await QuotaService.decrement(actorId, totalSize);
    }

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'PERMANENT_DELETE',
        details: JSON.stringify({ folderId, folderName: trashItem.folder.name }),
      },
    });

    return { trashItemId, folderId };
  }

  /**
   * Empty entire trash for the current user.
   * Permanently deletes all trashed items.
   */
  static async emptyTrash(userId: string) {
    const trashItems = await prisma.trashItem.findMany({
      where: {
        OR: [
          { file: { ownerId: userId } },
          { folder: { ownerId: userId } },
        ],
      },
      include: {
        file: { select: { id: true } },
        folder: { select: { id: true } },
      },
    });

    let deletedCount = 0;

    for (const item of trashItems) {
      if (item.fileId) {
        await TrashService.permanentDeleteFile(userId, item.id);
        deletedCount++;
      } else if (item.folderId) {
        await TrashService.permanentDeleteFolder(userId, item.id);
        deletedCount++;
      }
    }

    return { deletedCount };
  }

  /**
   * Auto-cleanup: permanently delete items older than TRASH_RETENTION_DAYS.
   * This should be run as a scheduled job (e.g., daily cron).
   */
  static async autoCleanup() {
    const cutoffDate = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const expiredItems = await prisma.trashItem.findMany({
      where: {
        deletedAt: { lt: cutoffDate },
      },
      include: {
        file: { select: { id: true, ownerId: true } },
        folder: { select: { id: true, ownerId: true } },
      },
    });

    let cleanedCount = 0;

    for (const item of expiredItems) {
      try {
        if (item.fileId && item.file) {
          await TrashService.permanentDeleteFile(item.file.ownerId, item.id);
          cleanedCount++;
        } else if (item.folderId && item.folder) {
          await TrashService.permanentDeleteFolder(item.folder.ownerId, item.id);
          cleanedCount++;
        }
      } catch (err) {
        console.error(`Failed to auto-cleanup trash item ${item.id}:`, err);
      }
    }

    return { cleanedCount, cutoffDate: cutoffDate.toISOString() };
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Recursively mark a folder and all descendants as trashed.
   */
  private static async markFolderTreeTrashed(folderId: string, trashedAt: Date) {
    // Mark folder as trashed
    await prisma.folder.update({
      where: { id: folderId },
      data: { isTrashed: true, trashedAt },
    });

    // Mark all files in folder as trashed
    await prisma.file.updateMany({
      where: { folderId },
      data: { isTrashed: true, trashedAt },
    });

    // Recursively mark subfolders
    const subfolders = await prisma.folder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    });

    for (const subfolder of subfolders) {
      await TrashService.markFolderTreeTrashed(subfolder.id, trashedAt);
    }
  }

  /**
   * Recursively restore a folder and all descendants.
   */
  private static async markFolderTreeRestored(folderId: string) {
    // Restore folder
    await prisma.folder.update({
      where: { id: folderId },
      data: { isTrashed: false, trashedAt: null },
    });

    // Restore all files in folder
    await prisma.file.updateMany({
      where: { folderId },
      data: { isTrashed: false, trashedAt: null },
    });

    // Recursively restore subfolders
    const subfolders = await prisma.folder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    });

    for (const subfolder of subfolders) {
      await TrashService.markFolderTreeRestored(subfolder.id);
    }
  }

  /**
   * Get all files in a folder tree (for quota calculation).
   */
  private static async getAllFilesInFolderTree(
    folderId: string,
  ): Promise<Array<{ id: string; size: bigint; storagePath: string }>> {
    const files = await prisma.file.findMany({
      where: { folderId },
      select: { id: true, size: true, storagePath: true },
    });

    const subfolders = await prisma.folder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    });

    for (const subfolder of subfolders) {
      const subfiles = await TrashService.getAllFilesInFolderTree(subfolder.id);
      files.push(...subfiles);
    }

    return files;
  }
}
