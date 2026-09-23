import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { QuotaService } from './storage/quota.service';
import path from 'path';
import fs from 'fs/promises';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VERSIONS_PER_FILE = 10; // Configurable limit

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatVersion(version: {
  id: string;
  versionNum: number;
  storagePath: string;
  size: bigint;
  createdAt: Date;
  fileId: string;
  file?: {
    id: string;
    name: string;
    mimeType: string;
    ownerId: string;
  };
}) {
  return {
    id: version.id,
    versionNum: version.versionNum,
    size: version.size.toString(),
    createdAt: version.createdAt.toISOString(),
    fileId: version.fileId,
    ...(version.file && {
      file: {
        id: version.file.id,
        name: version.file.name,
        mimeType: version.file.mimeType,
        ownerId: version.file.ownerId,
      },
    }),
  };
}

// ─── VersionService ───────────────────────────────────────────────────────────

export class VersionService {
  /**
   * Create a new version snapshot of a file.
   * Copies the current file to a versioned storage path.
   * Called automatically before updating a file.
   */
  static async createVersion(
    fileId: string,
    currentStoragePath: string,
    currentSize: bigint,
  ): Promise<string> {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, currentVer: true, ownerId: true },
    });

    if (!file) throw new AppError('File not found', 404);

    const nextVersionNum = file.currentVer;

    // Generate version storage path
    const ext = path.extname(currentStoragePath);
    const basename = path.basename(currentStoragePath, ext);
    const dirname = path.dirname(currentStoragePath);
    const versionPath = path.join(dirname, `${basename}_v${nextVersionNum}${ext}`);

    // Copy current file to version path
    try {
      await fs.copyFile(currentStoragePath, versionPath);
    } catch (err) {
      throw new AppError('Failed to create version snapshot', 500);
    }

    // Create version record
    const version = await prisma.fileVersion.create({
      data: {
        fileId,
        versionNum: nextVersionNum,
        storagePath: versionPath,
        size: currentSize,
      },
    });

    // Increment file's current version number
    await prisma.file.update({
      where: { id: fileId },
      data: { currentVer: { increment: 1 } },
    });

    // Enforce version limit (auto-cleanup oldest if exceeded)
    await VersionService.enforceVersionLimit(fileId);

    // Log activity
    await prisma.activity.create({
      data: {
        userId: file.ownerId,
        action: 'CREATE_VERSION',
        details: JSON.stringify({ fileId, versionNum: nextVersionNum }),
      },
    });

    return version.id;
  }

  /**
   * List all versions for a file.
   * Returns versions in descending order (newest first).
   */
  static async listVersions(actorId: string, fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file) throw new AppError('File not found', 404);

    // Only owner can view versions (or users with canView permission - checked by controller)
    if (file.ownerId !== actorId) {
      throw new AppError('You do not have permission to view versions of this file', 403);
    }

    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            ownerId: true,
          },
        },
      },
      orderBy: { versionNum: 'desc' },
    });

    return versions.map(formatVersion);
  }

  /**
   * Get a specific version by ID.
   */
  static async getVersion(actorId: string, versionId: string) {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            ownerId: true,
          },
        },
      },
    });

    if (!version) throw new AppError('Version not found', 404);

    // Only owner can view
    if (version.file.ownerId !== actorId) {
      throw new AppError('You do not have permission to view this version', 403);
    }

    return formatVersion(version);
  }

  /**
   * Restore a file to a specific version.
   * Replaces the current file with the versioned file.
   * Creates a new version of the current file before restoring.
   */
  static async restoreVersion(actorId: string, versionId: string) {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            storagePath: true,
            size: true,
            ownerId: true,
            currentVer: true,
          },
        },
      },
    });

    if (!version) throw new AppError('Version not found', 404);

    // Only owner can restore
    if (version.file.ownerId !== actorId) {
      throw new AppError('Only the owner can restore file versions', 403);
    }

    const currentFile = version.file;
    const currentStoragePath = currentFile.storagePath;
    const currentSize = currentFile.size;

    // Create a version snapshot of the current file before restoring
    await VersionService.createVersion(currentFile.id, currentStoragePath, currentSize);

    // Replace current file with version file
    try {
      await fs.copyFile(version.storagePath, currentStoragePath);
    } catch (err) {
      throw new AppError('Failed to restore version', 500);
    }

    // Update file size (quota handled separately if sizes differ)
    const sizeDelta = version.size - currentSize;
    if (sizeDelta !== BigInt(0)) {
      if (sizeDelta > 0) {
        // Check quota before increasing
        const quotaCheck = await QuotaService.check(actorId, sizeDelta);
        if (!quotaCheck.allowed) {
          throw new AppError('Insufficient storage quota to restore this version', 413);
        }
        await QuotaService.increment(actorId, sizeDelta);
      } else {
        await QuotaService.decrement(actorId, -sizeDelta);
      }
    }

    await prisma.file.update({
      where: { id: currentFile.id },
      data: { size: version.size },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'RESTORE_VERSION',
        details: JSON.stringify({
          fileId: currentFile.id,
          versionId,
          versionNum: version.versionNum,
        }),
      },
    });

    return {
      fileId: currentFile.id,
      restoredVersionNum: version.versionNum,
    };
  }

  /**
   * Delete a specific version.
   * Removes the physical file and version record.
   * Version quota is NOT decremented (versions are considered overhead).
   */
  static async deleteVersion(actorId: string, versionId: string) {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: {
        file: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!version) throw new AppError('Version not found', 404);

    // Only owner can delete versions
    if (version.file.ownerId !== actorId) {
      throw new AppError('Only the owner can delete versions', 403);
    }

    // Delete physical file
    try {
      await fs.unlink(version.storagePath);
    } catch (err) {
      console.error(`Failed to delete version file: ${version.storagePath}`, err);
    }

    // Delete version record
    await prisma.fileVersion.delete({
      where: { id: versionId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'DELETE_VERSION',
        details: JSON.stringify({
          fileId: version.fileId,
          versionId,
          versionNum: version.versionNum,
        }),
      },
    });

    return { versionId };
  }

  /**
   * Delete all versions for a file.
   * Useful for cleanup or when deleting the file itself.
   */
  static async deleteAllVersions(actorId: string, fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file) throw new AppError('File not found', 404);

    // Only owner can delete all versions
    if (file.ownerId !== actorId) {
      throw new AppError('Only the owner can delete all versions', 403);
    }

    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      select: { id: true, storagePath: true },
    });

    let deletedCount = 0;

    for (const version of versions) {
      try {
        await fs.unlink(version.storagePath);
      } catch (err) {
        console.error(`Failed to delete version file: ${version.storagePath}`, err);
      }
      deletedCount++;
    }

    // Delete all version records
    await prisma.fileVersion.deleteMany({
      where: { fileId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: actorId,
        action: 'DELETE_ALL_VERSIONS',
        details: JSON.stringify({ fileId, deletedCount }),
      },
    });

    return { fileId, deletedCount };
  }

  /**
   * Download a specific version file.
   * Returns the storage path for streaming.
   */
  static async getVersionDownloadPath(actorId: string, versionId: string): Promise<string> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: {
        file: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!version) throw new AppError('Version not found', 404);

    // Only owner can download versions
    if (version.file.ownerId !== actorId) {
      throw new AppError('You do not have permission to download this version', 403);
    }

    return version.storagePath;
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Enforce version limit per file.
   * If the file has more than MAX_VERSIONS_PER_FILE, delete the oldest ones.
   */
  private static async enforceVersionLimit(fileId: string): Promise<void> {
    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNum: 'asc' },
      select: { id: true, storagePath: true },
    });

    const excessCount = versions.length - MAX_VERSIONS_PER_FILE;

    if (excessCount > 0) {
      const toDelete = versions.slice(0, excessCount);

      for (const version of toDelete) {
        try {
          await fs.unlink(version.storagePath);
        } catch (err) {
          console.error(`Failed to delete excess version: ${version.storagePath}`, err);
        }

        await prisma.fileVersion.delete({
          where: { id: version.id },
        });
      }
    }
  }

  /**
   * Get the maximum version limit (for API responses).
   */
  static getMaxVersions(): number {
    return MAX_VERSIONS_PER_FILE;
  }
}
