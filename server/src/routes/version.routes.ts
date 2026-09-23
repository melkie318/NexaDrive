import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { VersionController } from '../controllers/version.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Versions
 *   description: File version history, restore, and management
 */

// All version routes require authentication
router.use(authenticateUser);

/**
 * @swagger
 * /api/v1/files/{fileId}/versions:
 *   get:
 *     summary: List all versions of a file
 *     tags: [Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of versions to return
 *     responses:
 *       200:
 *         description: File versions retrieved successfully
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
 *                         format: uuid
 *                       fileId:
 *                         type: string
 *                         format: uuid
 *                       versionNum:
 *                         type: integer
 *                       path:
 *                         type: string
 *                       size:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     maxVersionsPerFile:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: File not found
 */
router.get('/files/:fileId/versions', VersionController.listVersions);

/**
 * @swagger
 * /api/v1/files/{fileId}/versions:
 *   delete:
 *     summary: Delete all versions of a file (keeps current)
 *     tags: [Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: All versions deleted successfully
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
 *                     deletedCount:
 *                       type: integer
 *                       description: Number of versions deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: File not found
 */
router.delete('/files/:fileId/versions', VersionController.deleteAllVersions);

/**
 * @swagger
 * /api/v1/versions/{versionId}:
 *   get:
 *     summary: Get version details
 *     tags: [Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Version ID
 *     responses:
 *       200:
 *         description: Version details retrieved successfully
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
 *                       format: uuid
 *                     fileId:
 *                       type: string
 *                       format: uuid
 *                     versionNum:
 *                       type: integer
 *                     path:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     file:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         mimeType:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Version not found
 */
router.get('/versions/:versionId', VersionController.getVersion);

/**
 * @swagger
 * /api/v1/versions/{versionId}/restore:
 *   post:
 *     summary: Restore a specific version
 *     description: Restores the specified version as the current file. Automatically creates a backup of the current version before restoring.
 *     tags: [Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Version ID to restore
 *     responses:
 *       200:
 *         description: Version restored successfully
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
 *                     file:
 *                       type: object
 *                       description: Updated file object
 *                     backupVersion:
 *                       type: object
 *                       description: Backup version created before restore
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Version not found
 */
router.post('/versions/:versionId/restore', VersionController.restoreVersion);

/**
 * @swagger
 * /api/v1/versions/{versionId}/download:
 *   get:
 *     summary: Download a specific version
 *     description: Downloads the specified version with a timestamped filename
 *     tags: [Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Version ID to download
 *     responses:
 *       200:
 *         description: Version file download stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Version not found
 */
router.get('/versions/:versionId/download', VersionController.downloadVersion);

/**
 * @swagger
 * /api/v1/versions/{versionId}:
 *   delete:
 *     summary: Delete a specific version
 *     tags: [Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Version ID to delete
 *     responses:
 *       200:
 *         description: Version deleted successfully
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
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Version not found
 */
router.delete('/versions/:versionId', VersionController.deleteVersion);

export default router;
