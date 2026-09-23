import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { Visibility } from '@prisma/client';
import { StorageService } from './storage/storage.service';
import { QuotaService } from './storage/quota.service';
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
    size: Number(file.size),
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

// ─── FileService ──────────────────────────────────────────────────────────────

export class FileService {
  /**
   * Persist an uploaded file (already written to disk by multer) into the DB.
   * Quota is checked via QuotaService before anything is persisted.
   */
  static async uploadFile(
    userId: string,
    multerFile: Express.Multer.File,
    folderId?: string | null,
  ) {
    const fileSize = BigInt(multerFile.size);

    // ── 1. Quota check ───────────────────────────────────────────────────────
    const quotaCheck = await QuotaService.check(userId, fileSize);
    if (!quotaCheck.allowed) {
      await StorageService.delete(multerFile.path).catch(() => null);
      throw new AppError(
        `Storage quota exceeded. Available: ${quotaCheck.available} bytes, required: ${Number(fileSize)} bytes`,
        413,
      );
    }

    // ── 2. Validate folder ownership ─────────────────────────────────────────
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { ownerId: true, isTrashed: true },
      });
      if (!folder || folder.ownerId !== userId) {
        await StorageService.delete(multerFile.path).catch(() => null);
        throw new AppError('Target folder not found', 404);
      }
      if (folder.isTrashed) {
        await StorageService.delete(multerFile.path).catch(() => null);
        throw new AppError('Cannot upload into a trashed folder', 400);
      }
    }

    // ── 3. Move temp file → permanent location via StorageService ────────────
    const storageKey = await StorageService.save(
      multerFile.path,
      userId,
      multerFile.originalname,
    );

    // ── 4. Persist metadata + first version + increment quota atomically ─────
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

      await QuotaService.increment(userId, fileSize, tx);

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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get File By ID ─────────────────────────────────────────────────────────

  static async getFileById(userId: string, fileId: string) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('File is in the trash', 410);

    return formatFile(file);
  }

  // ─── Download File ──────────────────────────────────────────────────────────

  static async downloadFile(userId: string, fileId: string, res: Response): Promise<void> {
    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('File is in the trash', 410);

    const filePath = StorageService.resolve(file.storagePath);

    if (!(await StorageService.exists(file.storagePath))) {
      throw new AppError('File data not found on storage', 500);
    }

    const fileSize = await StorageService.size(file.storagePath);
    const encodedName = encodeURIComponent(file.name);
    const rangeHeader = res.req?.headers?.range;

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
        'Content-Type':        file.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      });

      await pipeline(createReadStream(filePath, { start, end }), res);
    } else {
      res.writeHead(200, {
        'Content-Length':      fileSize,
        'Content-Type':        file.mimeType,
        'Accept-Ranges':       'bytes',
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

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('Cannot rename a trashed file', 400);

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

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('Cannot move a trashed file', 400);

    const targetFolderId = data.folderId;

    if (targetFolderId !== null) {
      const folder = await prisma.folder.findUnique({
        where: { id: targetFolderId },
        select: { ownerId: true, isTrashed: true },
      });
      if (!folder || folder.ownerId !== userId) throw new AppError('Destination folder not found', 404);
      if (folder.isTrashed) throw new AppError('Cannot move a file into a trashed folder', 400);
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

  static async copyFile(userId: string, fileId: string, targetFolderId?: string | null) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file || file.ownerId !== userId) throw new AppError('File not found', 404);
    if (file.isTrashed) throw new AppError('Cannot copy a trashed file', 400);

    // ── Quota check ──────────────────────────────────────────────────────────
    const quotaCheck = await QuotaService.check(userId, file.size);
    if (!quotaCheck.allowed) {
      throw new AppError(
        `Storage quota exceeded. Available: ${quotaCheck.available} bytes, required: ${Number(file.size)} bytes`,
        413,
      );
    }

    const destFolderId = targetFolderId !== undefined ? targetFolderId : file.folderId;

    if (destFolderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: destFolderId },
        select: { ownerId: true, isTrashed: true },
      });
      if (!folder || folder.ownerId !== userId) throw new AppError('Destination folder not found', 404);
      if (folder.isTrashed) throw new AppError('Cannot copy into a trashed folder', 400);
    }

    // ── Physical copy via StorageService ─────────────────────────────────────
    const copyName   = `Copy of ${file.name}`;
    const newStorageKey = await StorageService.copy(file.storagePath, userId, copyName);

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

      await QuotaService.increment(userId, file.size, tx);

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
    // Delegate to TrashService for consistent trash handling
    const { TrashService } = await import('./trash.service');
    return await TrashService.moveFileToTrash(userId, fileId);
  }
}
