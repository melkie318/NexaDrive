import { Router } from 'express';
import { ZipController } from '../controllers/zip.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ZIP
 *   description: ZIP compression and extraction operations
 */

/**
 * @swagger
 * /api/v1/zip/folder:
 *   post:
 *     summary: Compress a folder into a ZIP archive
 *     tags: [ZIP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folderId
 *             properties:
 *               folderId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the folder to compress
 *     responses:
 *       200:
 *         description: ZIP file download stream
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Folder not found
 */
router.post('/folder', authenticateUser, ZipController.compressFolder);

/**
 * @swagger
 * /api/v1/zip/files:
 *   post:
 *     summary: Compress multiple files into a ZIP archive
 *     tags: [ZIP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileIds
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of file IDs to compress (max 100)
 *     responses:
 *       200:
 *         description: ZIP file download stream
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: One or more files not found
 */
router.post('/files', authenticateUser, ZipController.compressFiles);

/**
 * @swagger
 * /api/v1/zip/extract:
 *   post:
 *     summary: Extract a ZIP file into a target folder
 *     tags: [ZIP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileId
 *             properties:
 *               fileId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the ZIP file to extract
 *               targetFolderId:
 *                 type: string
 *                 format: uuid
 *                 description: Target folder ID (defaults to ZIP file's parent folder)
 *     responses:
 *       200:
 *         description: ZIP file extracted successfully
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
 *                     extractedFiles:
 *                       type: number
 *                       description: Number of files extracted
 *                     extractedFolders:
 *                       type: number
 *                       description: Number of folders created
 *                     totalSize:
 *                       type: number
 *                       description: Total size of extracted content in bytes
 *       400:
 *         description: Invalid request or file is not a ZIP archive
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions or quota
 *       404:
 *         description: File or target folder not found
 */
router.post('/extract', authenticateUser, ZipController.extractZip);

export default router;
