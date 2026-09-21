import { Router } from 'express';
import { FolderController } from '../controllers/folder.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Folders
 *   description: Folder management — create, browse, rename, move, and trash folders
 */

// All folder routes require authentication
router.use(authenticateUser);

/**
 * @swagger
 * /api/v1/folders:
 *   post:
 *     summary: Create a new folder
 *     description: Creates a folder at the root level or nested inside a parent folder. The parent must be owned by the authenticated user and must not be trashed.
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
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
 *                 example: University Projects
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the parent folder. Omit to create at root level.
 *                 example: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *               visibility:
 *                 type: string
 *                 enum: [PRIVATE, SHARED, PUBLIC]
 *                 default: PRIVATE
 *                 example: PRIVATE
 *     responses:
 *       201:
 *         description: Folder created successfully
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
 *                   example: Folder created
 *                 data:
 *                   $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error or parent folder is trashed
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Parent folder not found or not owned by user
 */
router.post('/', FolderController.createFolder);

/**
 * @swagger
 * /api/v1/folders:
 *   get:
 *     summary: List folders
 *     description: Returns a paginated list of the authenticated user's non-trashed folders at the specified level. Omitting `parentId` returns root-level folders (My Drive).
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the parent folder. Omit to list root-level folders.
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
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Paginated list of folders
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
 *                   example: Folders retrieved
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 *                 meta:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Not authenticated
 */
router.get('/', FolderController.listFolders);

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   get:
 *     summary: Get a folder by ID
 *     description: Returns the folder's details, its immediate subfolders, and a breadcrumb path from root to this folder.
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the folder
 *     responses:
 *       200:
 *         description: Folder details with subfolders and breadcrumb
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
 *                   example: Folder retrieved
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Folder'
 *                     - type: object
 *                       properties:
 *                         subfolders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Folder'
 *                         breadcrumb:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Folder not found or not owned by user
 *       410:
 *         description: Folder is in the trash
 */
router.get('/:id', FolderController.getFolderById);

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   patch:
 *     summary: Rename a folder
 *     description: Updates the folder's name. Only the owner can rename. Trashed folders cannot be renamed.
 *     tags: [Folders]
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
 *                 example: Renamed Folder
 *     responses:
 *       200:
 *         description: Folder renamed successfully
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
 *                   example: Folder renamed
 *                 data:
 *                   $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error or folder is trashed
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Folder not found or not owned by user
 */
router.patch('/:id', FolderController.renameFolder);

/**
 * @swagger
 * /api/v1/folders/{id}/move:
 *   patch:
 *     summary: Move a folder
 *     description: |
 *       Moves a folder to a new parent. Pass `parentId: null` to move to root (My Drive).
 *       Guards against moving a folder into itself or into any of its own descendants.
 *     tags: [Folders]
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
 *               - parentId
 *             properties:
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the new parent folder, or null to move to root.
 *                 example: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *     responses:
 *       200:
 *         description: Folder moved successfully
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
 *                   example: Folder moved
 *                 data:
 *                   $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Circular move detected, folder is trashed, or destination is trashed
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Folder or destination not found, or not owned by user
 */
router.patch('/:id/move', FolderController.moveFolder);

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   delete:
 *     summary: Move a folder to trash
 *     description: Soft-deletes the folder and its entire subtree (all nested subfolders and their files). The original path is preserved for later restoration. Use the Trash API to restore or permanently delete.
 *     tags: [Folders]
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
 *         description: Folder moved to trash
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
 *                   example: Folder moved to trash
 *                 data:
 *                   type: object
 *                   properties:
 *                     folderId:
 *                       type: string
 *                       format: uuid
 *                     trashedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Folder is already in the trash
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Folder not found or not owned by user
 */
router.delete('/:id', FolderController.deleteFolder);

/**
 * @swagger
 * components:
 *   schemas:
 *     Folder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *         name:
 *           type: string
 *           example: University Projects
 *         parentId:
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
 *         subfolderCount:
 *           type: integer
 *           example: 3
 *         fileCount:
 *           type: integer
 *           example: 12
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 50
 *         total:
 *           type: integer
 *           example: 24
 *         totalPages:
 *           type: integer
 *           example: 1
 */

export default router;
