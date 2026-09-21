import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { config } from '../config/env';
import { Visibility } from '@prisma/client';
import { RenameFileInput, MoveFileInput, ListFilesQuery } from '../validations/file.validation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFile(file: {
  id: string;
  name: string;
  size: bigint;
  mimeType: string;
  storagePath: string;
  folderId: string | null;
  ownerId: string;
  visibility: Visibility;
  isTrashed: boolean;
  trashedAt: Date | null;
  currentVer: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: file.id,
    name: file.name,
    size: Number(file.size),          // BigInt → number for JSON serialisation
    mimeType: file.mimeType,
    folderId: file.folderId,
    ownerId: file.ownerId,
    visibility: file.visibility,
    isTrashed: file.isTrashed,
    trashedAt: file.trashedAt?.toISOString() ?? null,
    currentVer: file.currentVer,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

/** Resolves and ensures the user-scoped upload directory exists. */
async function ensureUserDir(userId: string): Promise<string> {
  const userDir = path.resolve(config.storage.uploadDir, userId);
  await fsPromises.mkdir(userDir, { recursive: true });
  return userDir;
}

/**
 * Builds a safe, unique storage key for a file.
 * Format: <userId>/<timestamp>-<randomHex>-<sanitisedOriginalName>
 * The random hex prevents collisions on concurrent uploads of the same filename.
 */
function buildStoragePath(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2, 10);
  // Strip anything that isn't alphanumeric, dot, dash, or underscore
  const safe = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(userId, `${timestamp}-${random}-${safe}`);
}

/**
 * Returns the absolute filesystem path for a given storage key.
 */
function absolutePath(storageKey: string): string {
  return path.resolve(config.storage.uploadDir, storageKey);
}

// ─── FileService ──────────────────────────────────────────────────────────────

export class FileService {
  /**
   * Persist an uploaded file (already written to disk by multer) into the DB.
   * Also records the first FileVersion and increments the user's usedStorage.
   *
   * @param userId   - authenticated user's ID
   * @param multerFile - the file object provided by multer
   * @param folderId - optional target folder UUID (null = root / My Drive)
   */
  static async uploadFile(
    userId: string,
    multerFile: Express.Multer.File,
    folderId?: string | null,
  ) {
    // ── 1. Quota check ───────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuota: true, usedStorage: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const fileSize = BigInt(multerFile.size);
    const remaining = user.storageQuota - user.usedStorage;

    if (fileSize > remaining) {
      // Clean up the temp file multer wrote
      await fsPromises.unlink(multerFile.path).catch(() => null);
      throw new AppError(
        `Storage quota exceeded. Available: ${Number(remaining)} bytes, required: ${Number(fileSize)} bytes`,
        413,
      );
    }

    // ── 2. Validate folder ownership (if provided) ───────────────────────────
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true, ownerId: true, isTrashed: true },
      });

      if (!folder || folder.ownerId !== userId) {
        await fsPromises.unlink(multerFile.path).catch(() => null);
        throw new AppError('Target folder not found', 404);
      }
      if (folder.isTrashed) {
        await fsPromises.unlink(multerFile.path).catch(() => null);
        throw new AppError('Cannot upload into a trashed folder', 400);
      }
    }

    // ── 3. Move the temp file to its permanent user-scoped location ───────────
    const storageKey = buildStoragePath(userId, multerFile.originalname);
    const destAbsolute = absolutePath(storageKey);

    await ensureUserDir(userId);
    await fsPromises.rename(multerFile.path, destAbsolute);

    // ── 4. Persist metadata + first version + update quota atomically ────────
    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.file.create({
        data: {
          name: multerFile.originalname,
          size: fileSize,
          mimeType: multerFile.mimetype,
          storagePath: storageKey,
          folderId: folderId ?? null,
          ownerId: userId,
          visibility: Visibility.PRIVATE,
          currentVer: 1,
        },
      });

      await tx.fileVersion.create({
        data: {
          fileId: created.id,
          versionNum: 1,
          storagePath: storageKey,
          size: fileSize,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { usedStorage: { increment: fileSize } },
      });

      return created;
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'UPLOAD',
        details: JSON.stringify({
          fileId: file.id,
          name: file.name,
          size: Number(fileSize),
          folderId: folderId ?? null,
        }),
      },
    });

    return formatFile(file);
  }

  // ─── List Files ─────────────────────────────────────────────────────────────

  static async listFiles(userId: string, query: ListFilesQuery) {
    const { folderId, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where = {
      ownerId: userId,
      isTrashed: false,
      folderId: folderId ?? null,
    };

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.file.count({ where }),
    ]);

    return {
      files: files.map(formatFile),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get File By ID ─────────────────────────────────────────────────────────

  static async getFileById(userId: string, fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.ownerId !== userId) {
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      throw new AppError('File is in the trash', 410);
    }

    return formatFile(file);
  }

  // ─── Download File ──────────────────────────────────────────────────────────

  /**
   * Streams the file to the HTTP response.
   * Supports Range requests for resumable downloads / media seeking.
   */
  static async downloadFile(userId: string, fileId: string, res: Response): Promise<void> {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.ownerId !== userId) {
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      throw new AppError('File is in the trash', 410);
    }

    const filePath = absolutePath(file.storagePath);

    // Verify the file actually exists on disk
    try {
      await fsPromises.access(filePath, fs.constants.R_OK);
    } catch {
      throw new AppError('File data not found on storage', 500);
    }

    const stat = await fsPromises.stat(filePath);
    const fileSize = stat.size;

    // Path-traversal guard: resolved path must be inside the uploads root
    const uploadsRoot = path.resolve(config.storage.uploadDir);
    const resolvedFilePath = path.resolve(filePath);
    if (!resolvedFilePath.startsWith(uploadsRoot + path.sep) && resolvedFilePath !== uploadsRoot) {
      throw new AppError('Access denied', 403);
    }

    // Encode the filename for Content-Disposition (handles non-ASCII names)
    const encodedName = encodeURIComponent(file.name);

    const rangeHeader = res.req?.headers?.range;

    if (rangeHeader) {
      // ── Range request ────────────────────────────────────────────────────
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (!match) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (start > end || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      });

      await pipeline(createReadStream(filePath, { start, end }), res);
    } else {
      // ── Full download ────────────────────────────────────────────────────
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': file.mimeType,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      });

      await pipeline(createReadStream(filePath), res);
    }

    await prisma.activity.create({
      data: {
        userId,
        action: 'DOWNLOAD',
        details: JSON.stringify({ fileId: file.id, name: file.name }),
      },
    });
  }

  // ─── Rename File ────────────────────────────────────────────────────────────

  static async renameFile(userId: string, fileId: string, data: RenameFileInput) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, ownerId: true, isTrashed: true, name: true },
    });

    if (!file || file.ownerId !== userId) {
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      throw new AppError('Cannot rename a trashed file', 400);
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { name: data.name },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'RENAME',
        details: JSON.stringify({ fileId, oldName: file.name, newName: data.name }),
      },
    });

    return formatFile(updated);
  }

  // ─── Move File ──────────────────────────────────────────────────────────────

  static async moveFile(userId: string, fileId: string, data: MoveFileInput) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, ownerId: true, isTrashed: true, folderId: true, name: true },
    });

    if (!file || file.ownerId !== userId) {
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      throw new AppError('Cannot move a trashed file', 400);
    }

    const targetFolderId = data.folderId;

    if (targetFolderId !== null) {
      const folder = await prisma.folder.findUnique({
        where: { id: targetFolderId },
        select: { id: true, ownerId: true, isTrashed: true },
      });

      if (!folder || folder.ownerId !== userId) {
        throw new AppError('Destination folder not found', 404);
      }
      if (folder.isTrashed) {
        throw new AppError('Cannot move a file into a trashed folder', 400);
      }
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { folderId: targetFolderId },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'MOVE',
        details: JSON.stringify({
          fileId,
          name: file.name,
          fromFolderId: file.folderId,
          toFolderId: targetFolderId,
        }),
      },
    });

    return formatFile(updated);
  }

  // ─── Copy File ──────────────────────────────────────────────────────────────

  /**
   * Creates a physical copy of the file on disk and a new DB record.
   * The copy starts at version 1 and has the same owner.
   */
  static async copyFile(
    userId: string,
    fileId: string,
    targetFolderId?: string | null,
  ) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.ownerId !== userId) {
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      throw new AppError('Cannot copy a trashed file', 400);
    }

    // ── Quota check ──────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuota: true, usedStorage: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const remaining = user.storageQuota - user.usedStorage;
    if (file.size > remaining) {
      throw new AppError(
        `Storage quota exceeded. Available: ${Number(remaining)} bytes, required: ${Number(file.size)} bytes`,
        413,
      );
    }

    // ── Validate destination folder ──────────────────────────────────────────
    const destFolderId = targetFolderId !== undefined ? targetFolderId : file.folderId;

    if (destFolderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: destFolderId },
        select: { id: true, ownerId: true, isTrashed: true },
      });
      if (!folder || folder.ownerId !== userId) {
        throw new AppError('Destination folder not found', 404);
      }
      if (folder.isTrashed) {
        throw new AppError('Cannot copy into a trashed folder', 400);
      }
    }

    // ── Copy the physical file ────────────────────────────────────────────────
    const srcPath = absolutePath(file.storagePath);
    const copyName = `Copy of ${file.name}`;
    const newStorageKey = buildStoragePath(userId, copyName);
    const destPath = absolutePath(newStorageKey);

    await ensureUserDir(userId);
    await fsPromises.copyFile(srcPath, destPath);

    // ── Create DB record + version + update quota ────────────────────────────
    const copy = await prisma.$transaction(async (tx) => {
      const created = await tx.file.create({
        data: {
          name: copyName,
          size: file.size,
          mimeType: file.mimeType,
          storagePath: newStorageKey,
          folderId: destFolderId ?? null,
          ownerId: userId,
          visibility: Visibility.PRIVATE,
          currentVer: 1,
        },
      });

      await tx.fileVersion.create({
        data: {
          fileId: created.id,
          versionNum: 1,
          storagePath: newStorageKey,
          size: file.size,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { usedStorage: { increment: file.size } },
      });

      return created;
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'COPY',
        details: JSON.stringify({
          sourceFileId: fileId,
          newFileId: copy.id,
          name: copyName,
          folderId: destFolderId ?? null,
        }),
      },
    });

    return formatFile(copy);
  }

  // ─── Delete File (soft) ─────────────────────────────────────────────────────

  static async deleteFile(userId: string, fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, ownerId: true, isTrashed: true, name: true, folderId: true },
    });

    if (!file || file.ownerId !== userId) {
      throw new AppError('File not found', 404);
    }
    if (file.isTrashed) {
      throw new AppError('File is already in the trash', 400);
    }

    const originalPath = file.folderId
      ? `folder:${file.folderId}`
      : 'root';

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.file.update({
        where: { id: fileId },
        data: { isTrashed: true, trashedAt: now },
      });

      await tx.trashItem.create({
        data: {
          fileId,
          originalPath,
        },
      });
    });

    await prisma.activity.create({
      data: {
        userId,
        action: 'DELETE',
        details: JSON.stringify({ fileId, name: file.name, originalPath }),
      },
    });

    return { fileId, trashedAt: now.toISOString() };
  }
}
