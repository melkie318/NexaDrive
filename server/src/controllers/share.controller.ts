import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { ShareService } from '../services/share.service';
import {
  createDirectShareSchema,
  createGroupShareSchema,
} from '../validations/share.validation';

/**
 * @swagger
 * tags:
 *   name: Shares
 *   description: Direct and group-based resource sharing
 */

export class ShareController {
  /**
   * @swagger
   * /api/v1/shares/direct:
   *   post:
   *     summary: Share a resource (file or folder) with a specific user
   *     tags: [Shares]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [targetUserId, role]
   *             properties:
   *               fileId:
   *                 type: string
   *               folderId:
   *                 type: string
   *               targetUserId:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [VIEWER, EDITOR, OWNER, MANAGER, CONTRIBUTOR]
   *     responses:
   *       201:
   *         description: Resource shared successfully
   */
  static createDirectShare = asyncHandler(async (req: Request, res: Response) => {
    const data = createDirectShareSchema.parse(req.body);
    const share = await ShareService.createDirectShare(req.user!.id, data);
    return sendResponse(res, {
      statusCode: 201,
      message: 'Resource shared successfully',
      data: share,
    });
  });

  /**
   * @swagger
   * /api/v1/shares/group:
   *   post:
   *     summary: Share a resource (file or folder) with a group
   *     tags: [Shares]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [targetGroupId, role]
   *             properties:
   *               fileId:
   *                 type: string
   *               folderId:
   *                 type: string
   *               targetGroupId:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [VIEWER, EDITOR, OWNER, MANAGER, CONTRIBUTOR]
   *     responses:
   *       201:
   *         description: Resource shared with group successfully
   */
  static createGroupShare = asyncHandler(async (req: Request, res: Response) => {
    const data = createGroupShareSchema.parse(req.body);
    const share = await ShareService.createGroupShare(req.user!.id, data);
    return sendResponse(res, {
      statusCode: 201,
      message: 'Resource shared with group successfully',
      data: share,
    });
  });

  /**
   * @swagger
   * /api/v1/shares/my:
   *   get:
   *     summary: List resources I have shared with others
   *     tags: [Shares]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Shares retrieved successfully
   */
  static listMyShares = asyncHandler(async (req: Request, res: Response) => {
    const shares = await ShareService.listMyShares(req.user!.id);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Shares retrieved successfully',
      data: shares,
    });
  });

  /**
   * @swagger
   * /api/v1/shares/with-me:
   *   get:
   *     summary: List resources shared with me by others
   *     tags: [Shares]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Shares retrieved successfully
   */
  static listSharedWithMe = asyncHandler(async (req: Request, res: Response) => {
    const shares = await ShareService.listSharedWithMe(req.user!.id);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Shares retrieved successfully',
      data: shares,
    });
  });

  /**
   * @swagger
   * /api/v1/shares/{shareId}:
   *   delete:
   *     summary: Revoke a share (remove permission)
   *     tags: [Shares]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: shareId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Share revoked successfully
   */
  static revokeShare = asyncHandler(async (req: Request, res: Response) => {
    const result = await ShareService.revoke(req.user!.id, req.params.shareId);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Share revoked successfully',
      data: result,
    });
  });
}
