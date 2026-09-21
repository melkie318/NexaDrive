import { Request, Response } from 'express';
import { FolderService } from '../services/folder.service';
import { sendResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema,
  listFoldersQuerySchema,
} from '../validations/folder.validation';

export class FolderController {
  /**
   * POST /api/v1/folders
   * Create a new folder (optionally nested under a parent)
   */
  static createFolder = asyncHandler(async (req: Request, res: Response) => {
    const data = createFolderSchema.parse(req.body);
    const result = await FolderService.createFolder(req.user!.id, data);
    return sendResponse(res, {
      statusCode: 201,
      message: 'Folder created',
      data: result,
    });
  });

  /**
   * GET /api/v1/folders
   * List folders at a given level (root when parentId is omitted)
   */
  static listFolders = asyncHandler(async (req: Request, res: Response) => {
    const query = listFoldersQuerySchema.parse(req.query);
    const result = await FolderService.listFolders(req.user!.id, query);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Folders retrieved',
      data: result.folders,
      meta: result.pagination,
    });
  });

  /**
   * GET /api/v1/folders/:id
   * Get a single folder with its immediate subfolders and breadcrumb path
   */
  static getFolderById = asyncHandler(async (req: Request, res: Response) => {
    const result = await FolderService.getFolderById(req.user!.id, req.params.id as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Folder retrieved',
      data: result,
    });
  });

  /**
   * PATCH /api/v1/folders/:id
   * Rename a folder
   */
  static renameFolder = asyncHandler(async (req: Request, res: Response) => {
    const data = renameFolderSchema.parse(req.body);
    const result = await FolderService.renameFolder(req.user!.id, req.params.id as string, data);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Folder renamed',
      data: result,
    });
  });

  /**
   * PATCH /api/v1/folders/:id/move
   * Move a folder to a different parent (or to root when parentId is null)
   */
  static moveFolder = asyncHandler(async (req: Request, res: Response) => {
    const data = moveFolderSchema.parse(req.body);
    const result = await FolderService.moveFolder(req.user!.id, req.params.id as string, data);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Folder moved',
      data: result,
    });
  });

  /**
   * DELETE /api/v1/folders/:id
   * Soft-delete a folder (moves it and its entire subtree to the trash)
   */
  static deleteFolder = asyncHandler(async (req: Request, res: Response) => {
    const result = await FolderService.deleteFolder(req.user!.id, req.params.id as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Folder moved to trash',
      data: result,
    });
  });
}
