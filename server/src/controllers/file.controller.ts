import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/file.service';
import { sendResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middlewares/errorHandler';
import {
  renameFileSchema,
  moveFileSchema,
  listFilesQuerySchema,
} from '../validations/file.validation';

export class FileController {
  /**
   * POST /api/v1/files/upload
   * Accepts multipart/form-data with a single field named "file".
   * Optional body field: folderId (UUID string)
   */
  static uploadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No file was uploaded. Use field name "file".', 400);
    }

    // folderId may arrive as a form field alongside the binary
    const folderId = typeof req.body.folderId === 'string' && req.body.folderId.trim()
      ? req.body.folderId.trim()
      : null;

    const result = await FileService.uploadFile(req.user!.id, req.file, folderId);

    return sendResponse(res, {
      statusCode: 201,
      message: 'File uploaded',
      data: result,
    });
  });

  /**
   * GET /api/v1/files
   * List the authenticated user's non-trashed files at a given level.
   */
  static listFiles = asyncHandler(async (req: Request, res: Response) => {
    const query = listFilesQuerySchema.parse(req.query);
    const result = await FileService.listFiles(req.user!.id, query);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Files retrieved',
      data: result.files,
      meta: result.pagination,
    });
  });

  /**
   * GET /api/v1/files/:id
   * Return metadata for a single file.
   */
  static getFileById = asyncHandler(async (req: Request, res: Response) => {
    const result = await FileService.getFileById(req.user!.id, req.params.id as string);

    return sendResponse(res, {
      statusCode: 200,
      message: 'File retrieved',
      data: result,
    });
  });

  /**
   * GET /api/v1/files/:id/download
   * Stream the file to the client. Supports Range requests.
   * This handler does NOT use asyncHandler because it manually manages the
   * response stream — errors are forwarded to next() instead.
   */
  static downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await FileService.downloadFile(req.user!.id, req.params.id as string, res);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/files/:id
   * Rename a file.
   */
  static renameFile = asyncHandler(async (req: Request, res: Response) => {
    const data = renameFileSchema.parse(req.body);
    const result = await FileService.renameFile(req.user!.id, req.params.id as string, data);

    return sendResponse(res, {
      statusCode: 200,
      message: 'File renamed',
      data: result,
    });
  });

  /**
   * PATCH /api/v1/files/:id/move
   * Move a file to a different folder (or to root when folderId is null).
   */
  static moveFile = asyncHandler(async (req: Request, res: Response) => {
    const data = moveFileSchema.parse(req.body);
    const result = await FileService.moveFile(req.user!.id, req.params.id as string, data);

    return sendResponse(res, {
      statusCode: 200,
      message: 'File moved',
      data: result,
    });
  });

  /**
   * POST /api/v1/files/:id/copy
   * Create a copy of a file, optionally in a different folder.
   */
  static copyFile = asyncHandler(async (req: Request, res: Response) => {
    // targetFolderId is optional; if omitted the copy lands in the same folder
    const targetFolderId =
      typeof req.body.folderId === 'string' && req.body.folderId.trim()
        ? req.body.folderId.trim()
        : undefined;

    const result = await FileService.copyFile(
      req.user!.id,
      req.params.id as string,
      targetFolderId,
    );

    return sendResponse(res, {
      statusCode: 201,
      message: 'File copied',
      data: result,
    });
  });

  /**
   * DELETE /api/v1/files/:id
   * Soft-delete a file (moves it to the trash).
   */
  static deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const result = await FileService.deleteFile(req.user!.id, req.params.id as string);

    return sendResponse(res, {
      statusCode: 200,
      message: 'File moved to trash',
      data: result,
    });
  });
}
