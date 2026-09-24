import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { ShareController } from '../controllers/share.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sharing
 *   description: Direct file and folder sharing with users and groups
 */

// All share routes require authentication
router.use(authenticateUser);

/**
 * @swagger
 * /api/v1/shares/direct:
 *   post:
 *     summary: Share a resource directly with a user
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - permission
 *             properties:
 *               fileId:
 *                 type: string
 *                 format: uuid
 *                 description: File ID (provide either fileId or folderId)
 *               folderId:
 *                 type: string
 *                 format: uuid
 *                 description: Folder ID (provide either fileId or folderId)
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to share with
 *               permission:
 *                 type: string
 *                 enum: [VIEW, EDIT, MANAGE]
 *                 description: Permission level for the recipient
 *     responses:
 *       201:
 *         description: Share created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fileId:
 *                       type: string
 *                     folderId:
 *                       type: string
 *                     recipientId:
 *                       type: string
 *                     permission:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request - must provide either fileId or folderId
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Resource or recipient not found
 */
router.post('/direct', ShareController.createDirectShare);

/**
 * @swagger
 * /api/v1/shares/group:
 *   post:
 *     summary: Share a resource with a group
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - permission
 *             properties:
 *               fileId:
 *                 type: string
 *                 format: uuid
 *                 description: File ID (provide either fileId or folderId)
 *               folderId:
 *                 type: string
 *                 format: uuid
 *                 description: Folder ID (provide either fileId or folderId)
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: Group ID to share with
 *               permission:
 *                 type: string
 *                 enum: [VIEW, EDIT, MANAGE]
 *                 description: Permission level for the group
 *     responses:
 *       201:
 *         description: Group share created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Resource or group not found
 */
router.post('/group', ShareController.createGroupShare);

/**
 * @swagger
 * /api/v1/shares/my:
 *   get:
 *     summary: List shares I created
 *     description: Get all resources that the current user has shared with others
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shares retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fileId:
 *                         type: string
 *                       folderId:
 *                         type: string
 *                       recipientId:
 *                         type: string
 *                       groupId:
 *                         type: string
 *                       permission:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       recipient:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           username:
 *                             type: string
 *                       group:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       file:
 *                         type: object
 *                       folder:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/my', ShareController.listMyShares);

/**
 * @swagger
 * /api/v1/shares/with-me:
 *   get:
 *     summary: List shares with me
 *     description: Get all resources that others have shared with the current user
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shared resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fileId:
 *                         type: string
 *                       folderId:
 *                         type: string
 *                       permission:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       file:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           size:
 *                             type: integer
 *                           mimeType:
 *                             type: string
 *                       folder:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       owner:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           username:
 *                             type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/with-me', ShareController.listSharedWithMe);

/**
 * @swagger
 * /api/v1/shares/{shareId}:
 *   delete:
 *     summary: Revoke a share
 *     description: Remove sharing access for a specific share (only owner can revoke)
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Share ID to revoke
 *     responses:
 *       200:
 *         description: Share revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the share owner
 *       404:
 *         description: Share not found
 */
router.delete('/:shareId', ShareController.revokeShare);

export default router;
