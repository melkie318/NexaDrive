import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { StorageService } from './storage/storage.service';
import { QuotaService } from './storage/quota.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVersion(v: {
  id: string;
  fileId: string;
  versionNum: number;
  storagePath: string;
  size: bigint;
  createdAt: Date;
}) {
  return {
    id: v.id,
    fileId: v.fileId,
    versionNum: v.versionNum,
    size: Number(v.size),
    createdAt: v.createdAt.toISOString(),
  };
}

// ─── FileVersionService ───────────────────────────────────────────────────────

export class FileVersionService {
  // ─── Upload New Version ────────────────────────────────────────────────────

  /**
   * Upload a new version of an existing file.
   *
   * Flow:
   *   1. Verify file ownership
   *   2. Quota check for the new binary
   *   3. Save temp file → permanent storage key
   *   4. Inside one transaction:
   *      - Create FileVersion (versionNum = currentVer + 1)
   *      - Update File: storagePath, size, currentVer, mimeType
   *      - Increment usedStorage by new file size
   *   5. Log VERSION_UPLOAD activity
   */
  static async uploadVersion(
    userId: string,
    fileId: string,
    multerFile: Express.Multer.File,
  ) {
    // ── 1. Ownership check ────────────────────────────────────────────────────
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true, ownerId: true, isTrashed: true,
        name: true, currentVer: true,
      },
    });

    if (!file || file.ownerId !== userId) {
      await StorageService.delete(multerFile.path).catch(() => null);
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      await StorageService.delete(multerFile.path).catch(() => null);
      throw new AppError('Cannot upload a version to a trashed file', 400);
    }

    const newSize = BigInt(multerFile.size);

    // ── 2. Quota check ────────────────────────────────────────────────────────
    const quotaCheck = await QuotaService.check(userId, newSize);
    if (!quotaCheck.allowed) {
      await StorageService.delete(multerFile.path).catch(() => null);
      throw new AppError(
        `Storage quota exceeded. Available: ${quotaCheck.available} bytes, required: ${Number(newSize)} bytes`,
        413,
      );
    }

    // ── 3. Persist binary ─────────────────────────────────────────────────────
    const storageKey = await StorageService.save(
      multerFile.path,
      userId,
      multerFile.originalname,
    );

    const nextVerNum = file.currentVer + 1;

    // ── 4. Atomic DB update ───────────────────────────────────────────────────
    const [version, updatedFile] = await prisma.$transaction(async (tx) => {
      const ver = await tx.fileVersion.create({
        data: {
          fileId,
          versionNum: nextVerNum,
          storagePath: storageKey,
          size: newSize,
        },
      });

      const updated = await tx.file.update({
        where: { id: fileId },
        data: {
          storagePath: storageKey,
          size: newSize,
          mimeType: multerFile.mimetype,
          currentVer: nextVerNum,
        },
      });

      await QuotaService.increment(userId, newSize, tx);

      return [ver, updated] as const;
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'VERSION_UPLOAD',
        details: JSON.stringify({
          fileId,
          fileName: file.name,
          versionNum: nextVerNum,
          size: Number(newSize),
        }),
      },
    });

    return {
      version: formatVersion(version),
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        currentVer: updatedFile.currentVer,
        size: Number(updatedFile.size),
        mimeType: updatedFile.mimeType,
        updatedAt: updatedFile.updatedAt.toISOString(),
      },
    };
  }

  // ─── List Versions ─────────────────────────────────────────────────────────

  /**
   * Return all versions of a file ordered newest-first.
   * Marks which version is the current (active) one.
   */
  static async listVersions(userId: string, fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, ownerId: true, isTrashed: true, currentVer: true, name: true },
    });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('File is in the trash', 410);

    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNum: 'desc' },
    });

    return {
      fileId,
      fileName: file.name,
      currentVer: file.currentVer,
      versions: versions.map((v) => ({
        ...formatVersion(v),
        isCurrent: v.versionNum === file.currentVer,
      })),
    };
  }

  // ─── Get Single Version ────────────────────────────────────────────────────

  static async getVersion(userId: string, fileId: string, versionId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { ownerId: true, isTrashed: true, currentVer: true, name: true },
    });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('File is in the trash', 410);

    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.fileId !== fileId) {
      throw new AppError('Version not found', 404);
    }

    return {
      ...formatVersion(version),
      isCurrent: version.versionNum === file.currentVer,
      fileName: file.name,
    };
  }

  // ─── Download a Specific Version ───────────────────────────────────────────

  /**
   * Stream a specific version's binary to the HTTP response.
   * Supports Range requests just like the main file download.
   */
  static async downloadVersion(
    userId: string,
    fileId: string,
    versionId: string,
    res: Response,
  ): Promise<void> {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { ownerId: true, isTrashed: true, name: true },
    });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('File is in the trash', 410);

    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.fileId !== fileId) {
      throw new AppError('Version not found', 404);
    }

    if (!(await StorageService.exists(version.storagePath))) {
      throw new AppError('Version data not found on storage', 500);
    }

    const filePath  = StorageService.resolve(version.storagePath);
    const fileSize  = await StorageService.size(version.storagePath);
    // Append version number to the filename so the browser saves it distinctly
    const downloadName = `v${version.versionNum}_${file.name}`;
    const encodedName  = encodeURIComponent(downloadName);
    const rangeHeader  = res.req?.headers?.range;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (!match) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end   = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (start > end || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      res.writeHead(206, {
        'Content-Range':       `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':       'bytes',
        'Content-Length':      end - start + 1,
        'Content-Type':        'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      });

      await pipeline(createReadStream(filePath, { start, end }), res);
    } else {
      res.writeHead(200, {
        'Content-Length':      fileSize,
        'Content-Type':        'application/octet-stream',
        'Accept-Ranges':       'bytes',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      });

      await pipeline(createReadStream(filePath), res);
    }

    await prisma.activity.create({
      data: {
        userId,
        action: 'DOWNLOAD',
        details: JSON.stringify({
          fileId,
          fileName: file.name,
          versionId,
          versionNum: version.versionNum,
        }),
      },
    });
  }

  // ─── Restore a Version ─────────────────────────────────────────────────────

  /**
   * Restore a previous version as the new current version.
   *
   * Strategy: copy the version's physical file → create a new FileVersion at
   * currentVer+1 pointing to the copy → update File to point at the new key.
   * This way the version history is never mutated — the restore itself becomes
   * a new version entry so the full audit trail is preserved.
   *
   * Quota is checked because the copy costs storage space.
   */
  static async restoreVersion(
    userId: string,
    fileId: string,
    versionId: string,
  ) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('Cannot restore a version of a trashed file', 400);

    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.fileId !== fileId) {
      throw new AppError('Version not found', 404);
    }

    if (version.versionNum === file.currentVer) {
      throw new AppError('This version is already the current version', 400);
    }

    // ── Quota check ───────────────────────────────────────────────────────────
    const quotaCheck = await QuotaService.check(userId, version.size);
    if (!quotaCheck.allowed) {
      throw new AppError(
        `Storage quota exceeded. Available: ${quotaCheck.available} bytes, required: ${Number(version.size)} bytes`,
        413,
      );
    }

    // ── Copy binary ───────────────────────────────────────────────────────────
    const restoredName  = `restored_v${version.versionNum}_${file.name}`;
    const newStorageKey = await StorageService.copy(
      version.storagePath,
      userId,
      restoredName,
    );

    const nextVerNum = file.currentVer + 1;

    // ── Atomic DB update ──────────────────────────────────────────────────────
    const [newVersion, updatedFile] = await prisma.$transaction(async (tx) => {
      const ver = await tx.fileVersion.create({
        data: {
          fileId,
          versionNum: nextVerNum,
          storagePath: newStorageKey,
          size: version.size,
        },
      });

      const updated = await tx.file.update({
        where: { id: fileId },
        data: {
          storagePath: newStorageKey,
          size: version.size,
          currentVer: nextVerNum,
        },
      });

      await QuotaService.increment(userId, version.size, tx);

      return [ver, updated] as const;
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'VERSION_RESTORE',
        details: JSON.stringify({
          fileId,
          fileName: file.name,
          restoredFromVersionId: versionId,
          restoredFromVersionNum: version.versionNum,
          newVersionNum: nextVerNum,
        }),
      },
    });

    return {
      version: { ...formatVersion(newVersion), isCurrent: true },
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        currentVer: updatedFile.currentVer,
        size: Number(updatedFile.size),
        updatedAt: updatedFile.updatedAt.toISOString(),
      },
    };
  }

  // ─── Delete a Version ──────────────────────────────────────────────────────

  /**
   * Permanently delete a specific version.
   *
   * Rules:
   *  - Cannot delete the current (active) version — delete the file itself instead.
   *  - Deletes the physical binary from storage.
   *  - Decrements the user's usedStorage by the version's size.
   */
  static async deleteVersion(
    userId: string,
    fileId: string,
    versionId: string,
  ) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { ownerId: true, isTrashed: true, currentVer: true, name: true },
    });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);

    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.fileId !== fileId) {
      throw new AppError('Version not found', 404);
    }

    if (version.versionNum === file.currentVer) {
      throw new AppError(
        'Cannot delete the current active version. Trash the file to remove it.',
        400,
      );
    }

    // ── Delete physical file + DB record + decrement quota ────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.fileVersion.delete({ where: { id: versionId } });
      await QuotaService.decrement(userId, version.size, tx);
    });

    // Best-effort: remove the binary (don't block on failure)
    await StorageService.delete(version.storagePath).catch(() => null);

    await prisma.activity.create({
      data: {
        userId,
        action: 'VERSION_DELETE',
        details: JSON.stringify({
          fileId,
          fileName: file.name,
          versionId,
          versionNum: version.versionNum,
          sizeFreed: Number(version.size),
        }),
      },
    });

    return {
      versionId,
      versionNum: version.versionNum,
      sizeFreed: Number(version.size),
    };
  }
}
