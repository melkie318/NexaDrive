import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { TrashService } from '../services/trash.service';
import { moveToTrashSchema } from '../validations/trash.validation';

/**
 * @swagger
 * tags:
 *   name: Trash
 *   description: Trash bin and recovery operations
 */

export class TrashController {
  /**
   * @swagger
   * /api/v1/trash:
   *   post:
   *     summary: Move a file or folder to trash (soft delete)
   *     tags: [Trash]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fileId:
   *                 type: string
   *               folderId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Item moved to trash successfully
   */
  static moveToTrash = asyncHandler(async (req: Request, res: Response) => {
    const data = moveToTrashSchema.parse(req.body);
    
    let result;
    if (data.fileId) {
      result = await TrashService.moveFileToTrash(req.user!.id, data.fileId);
    } else if (data.folderId) {
      result = await TrashService.moveFolderToTrash(req.user!.id, data.folderId);
    }

    return sendResponse(res, {
      statusCode: 200,
      message: 'Item moved to trash successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/trash:
   *   get:
   *     summary: List all items in trash
   *     tags: [Trash]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [file, folder, all]
   *         description: Filter by item type
   *     responses:
   *       200:
   *         description: Trash items retrieved successfully
   */
  static listTrash = asyncHandler(async (req: Request, res: Response) => {
    const items = await TrashService.listTrash(req.user!.id);
    
    // Apply type filter if specified
    const typeFilter = req.query.type as string | undefined;
    const filteredItems = typeFilter && typeFilter !== 'all'
      ? items.filter((item: any) => item.type === typeFilter)
      : items;

    return sendResponse(res, {
      statusCode: 200,
      message: 'Trash items retrieved successfully',
      data: filteredItems,
    });
  });

  /**
   * @swagger
   * /api/v1/trash/{trashItemId}/restore:
   *   post:
   *     summary: Restore an item from trash
   *     tags: [Trash]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: trashItemId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Item restored successfully
   */
  static restore = asyncHandler(async (req: Request, res: Response) => {
    const trashItemId = req.params.trashItemId as string;
    
    // Determine if it's a file or folder
    const trashItems = await TrashService.listTrash(req.user!.id);
    const item = trashItems.find((i: any) => i.id === trashItemId);
    
    if (!item) {
      return sendResponse(res, {
        statusCode: 404,
        message: 'Trash item not found',
        data: null,
      });
    }

    let result;
    if ('type' in item && item.type === 'file') {
      result = await TrashService.restoreFile(req.user!.id, trashItemId);
    } else {
      result = await TrashService.restoreFolder(req.user!.id, trashItemId);
    }

    return sendResponse(res, {
      statusCode: 200,
      message: 'Item restored successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/trash/{trashItemId}:
   *   delete:
   *     summary: Permanently delete an item from trash
   *     tags: [Trash]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: trashItemId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Item permanently deleted
   */
  static permanentDelete = asyncHandler(async (req: Request, res: Response) => {
    const trashItemId = req.params.trashItemId as string;
    
    // Determine if it's a file or folder
    const trashItems = await TrashService.listTrash(req.user!.id);
    const item = trashItems.find((i: any) => i.id === trashItemId);
    
    if (!item) {
      return sendResponse(res, {
        statusCode: 404,
        message: 'Trash item not found',
        data: null,
      });
    }

    let result;
    if ('type' in item && item.type === 'file') {
      result = await TrashService.permanentDeleteFile(req.user!.id, trashItemId);
    } else {
      result = await TrashService.permanentDeleteFolder(req.user!.id, trashItemId);
    }

    return sendResponse(res, {
      statusCode: 200,
      message: 'Item permanently deleted',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/trash/empty:
   *   delete:
   *     summary: Empty entire trash (permanently delete all items)
   *     tags: [Trash]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Trash emptied successfully
   */
  static emptyTrash = asyncHandler(async (req: Request, res: Response) => {
    const result = await TrashService.emptyTrash(req.user!.id);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Trash emptied successfully',
      data: result,
    });
  });
}
