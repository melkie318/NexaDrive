import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Storage
 *   description: Storage quota and engine — track usage, remaining space, and file/folder counts
 */

router.use(authenticateUser);

/**
 * @swagger
 * /api/v1/storage/quota:
 *   get:
 *     summary: Get storage quota
 *     description: |
 *       Returns the authenticated user's full storage breakdown:
 *       - Total quota (bytes)
 *       - Used storage (bytes)
 *       - Available storage (bytes)
 *       - Usage percentage
 *       - Near-full and full warning flags
 *       - Active file, folder, and trashed item counts
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage quota stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Storage quota retrieved
 *                 data:
 *                   $ref: '#/components/schemas/StorageQuota'
 *       401:
 *         description: Not authenticated
 */
router.get('/quota', StorageController.getQuota);

/**
 * @swagger
 * components:
 *   schemas:
 *     StorageQuota:
 *       type: object
 *       properties:
 *         storageQuota:
 *           type: string
 *           description: Total quota in bytes (as string to handle large numbers safely)
 *           example: "549755813888"
 *         usedStorage:
 *           type: string
 *           description: Bytes consumed
 *           example: "10485760"
 *         availableStorage:
 *           type: string
 *           description: Bytes still available
 *           example: "539270053888"
 *         usagePercent:
 *           type: number
 *           description: Usage as a percentage (0–100)
 *           example: 1.91
 *         isNearFull:
 *           type: boolean
 *           description: True when usage is at or above 90%
 *           example: false
 *         isFull:
 *           type: boolean
 *           description: True when no space remains
 *           example: false
 *         fileCount:
 *           type: integer
 *           description: Number of active (non-trashed) files
 *           example: 42
 *         folderCount:
 *           type: integer
 *           description: Number of active (non-trashed) folders
 *           example: 8
 *         trashedFileCount:
 *           type: integer
 *           description: Number of files currently in the trash
 *           example: 3
 *         trashedFolderCount:
 *           type: integer
 *           description: Number of folders currently in the trash
 *           example: 1
 */

export default router;
