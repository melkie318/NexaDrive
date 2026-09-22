import { Router, Request, Response, NextFunction } from 'express';
import { FileController } from '../controllers/file.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { uploadSingle } from '../middlewares/upload.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { AppError } from '../middlewares/errorHandler';
import multer from 'multer';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File storage and operations — upload, download, rename, move, copy, and trash files
 */

router.use(authenticateUser);

/**
 * Wraps multer's uploadSingle so multer errors become proper AppErrors.
 */
function handleUpload(req: Request, res: Response, next: NextFunction): void {
  uploadSingle(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds the maximum allowed limit', 413));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    }
    if (err instanceof Error) return next(new AppError(err.message, 400));
    next(err);
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Upload a file
 *     description: |
 *       Uploads a single file using `multipart/form-data`. The binary must be
 *       sent in the field named **`file`**. An optional `folderId` form field
 *       places the upload inside a specific folder; omitting it uploads to root.
 *
 *       When a `folderId` is supplied the caller must have **canUpload** on that
 *       folder. The storage quota is checked before the file is persisted.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folderId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                   example: File uploaded
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: No file provided or unsupported MIME type
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canUpload on the destination folder
 *       404:
 *         description: Target folder not found
 *       413:
 *         description: File exceeds size limit or storage quota exceeded
 */
// folderId arrives after multer in req.body — permission check is inside FileService.uploadFile
router.post('/upload', handleUpload, FileController.uploadFile);

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: List files
 *     description: |
 *       Returns a paginated list of the authenticated user's non-trashed files.
 *       Omitting `folderId` returns root-level files.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, size, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Paginated list of files
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
 *                   example: Files retrieved
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 meta:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Not authenticated
 */
// Scoped to ownerId in the service — no per-resource guard needed
router.get('/', FileController.listFiles);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get file metadata
 *     description: Returns metadata for a single file. Requires **canView** on the file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File metadata
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
 *                   example: File retrieved
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canView on this file
 *       404:
 *         description: File not found
 *       410:
 *         description: File is in the trash
 */
router.get(
  '/:id',
  requirePermission('file', (req) => req.params.id, 'canView'),
  FileController.getFileById,
);

/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Download a file
 *     description: |
 *       Streams the file binary to the client. Supports HTTP **Range** requests.
 *       Requires **canDownload** on the file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: Range
 *         schema:
 *           type: string
 *           example: bytes=0-1023
 *     responses:
 *       200:
 *         description: Full file binary stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       206:
 *         description: Partial content (Range request honoured)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canDownload on this file
 *       404:
 *         description: File not found
 *       410:
 *         description: File is in the trash
 *       416:
 *         description: Range not satisfiable
 */
router.get(
  '/:id/download',
  requirePermission('file', (req) => req.params.id, 'canDownload'),
  FileController.downloadFile,
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   patch:
 *     summary: Rename a file
 *     description: Updates the file's display name. Requires **canRename** on the file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: final_report_v2.pdf
 *     responses:
 *       200:
 *         description: File renamed successfully
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
 *                   example: File renamed
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: Validation error or file is trashed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canRename on this file
 *       404:
 *         description: File not found
 */
router.patch(
  '/:id',
  requirePermission('file', (req) => req.params.id, 'canRename'),
  FileController.renameFile,
);

/**
 * @swagger
 * /api/v1/files/{id}/move:
 *   patch:
 *     summary: Move a file
 *     description: |
 *       Moves a file to a different folder. Pass folderId as null to move to root.
 *       Requires **canMove** on the file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 nullable: true
 *     responses:
 *       200:
 *         description: File moved successfully
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
 *                   example: File moved
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: Validation error or file is trashed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canMove on this file
 *       404:
 *         description: File or destination folder not found
 */
router.patch(
  '/:id/move',
  requirePermission('file', (req) => req.params.id, 'canMove'),
  FileController.moveFile,
);

/**
 * @swagger
 * /api/v1/files/{id}/copy:
 *   post:
 *     summary: Copy a file
 *     description: |
 *       Creates a full copy of the file. The copy is named "Copy of {original}".
 *       Requires **canCopy** on the file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folderId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Destination folder. Omit to copy to the same folder.
 *     responses:
 *       201:
 *         description: File copied successfully
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
 *                   example: File copied
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: File is trashed or destination is trashed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canCopy on this file
 *       404:
 *         description: File or destination folder not found
 *       413:
 *         description: Storage quota exceeded
 */
router.post(
  '/:id/copy',
  requirePermission('file', (req) => req.params.id, 'canCopy'),
  FileController.copyFile,
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Move a file to trash
 *     description: |
 *       Soft-deletes the file. Requires **canDelete** on the file.
 *       The original folder location is preserved for restore.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File moved to trash
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
 *                   example: File moved to trash
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileId:
 *                       type: string
 *                       format: uuid
 *                     trashedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: File is already in the trash
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canDelete on this file
 *       404:
 *         description: File not found
 */
router.delete(
  '/:id',
  requirePermission('file', (req) => req.params.id, 'canDelete'),
  FileController.deleteFile,
);

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *         name:
 *           type: string
 *           example: report.pdf
 *         size:
 *           type: integer
 *           description: File size in bytes
 *           example: 204800
 *         mimeType:
 *           type: string
 *           example: application/pdf
 *         folderId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           example: null
 *         ownerId:
 *           type: string
 *           format: uuid
 *         visibility:
 *           type: string
 *           enum: [PRIVATE, SHARED, PUBLIC]
 *           example: PRIVATE
 *         isTrashed:
 *           type: boolean
 *           example: false
 *         trashedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         currentVer:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router;
