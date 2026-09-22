import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: |
 *     Resource-level authorization engine. Grant, list, update, and revoke
 *     permissions on files and folders. Supports direct user permissions,
 *     group permissions, and ancestor folder inheritance.
 */

router.use(authenticateUser);

// ─── Shared param note ────────────────────────────────────────────────────────
// :resourceType  — "file" or "folder"
// :resourceId    — UUID of the target file or folder
// :permissionId  — UUID of a ResourcePermission row

/**
 * @swagger
 * /api/v1/permissions/{resourceType}/{resourceId}:
 *   post:
 *     summary: Grant a permission
 *     description: |
 *       Grant a permission on a file or folder to a specific user or group.
 *       The caller must have **canManagePermissions** on the resource
 *       (i.e. be the owner or hold OWNER/MANAGER role via an existing permission).
 *
 *       Provide either `userId` OR `groupId`, never both.
 *       When `role` is `CUSTOM`, `customOps` must contain at least one operation.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [file, folder]
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GrantPermissionInput'
 *     responses:
 *       201:
 *         description: Permission granted
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
 *                   example: Permission granted
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation error (both/neither userId+groupId, missing customOps for CUSTOM)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canManagePermissions on this resource
 *       404:
 *         description: Resource, target user, or target group not found
 *       409:
 *         description: A permission for this user/group already exists — use PATCH to update
 */
router.post('/:resourceType/:resourceId', PermissionController.grant);

/**
 * @swagger
 * /api/v1/permissions/{resourceType}/{resourceId}:
 *   get:
 *     summary: List all permissions on a resource
 *     description: |
 *       Returns every ResourcePermission entry for the given file or folder,
 *       including the user or group it is assigned to.
 *       Requires **canManagePermissions** on the resource.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [file, folder]
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of permissions
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
 *                   example: Permissions retrieved
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canManagePermissions on this resource
 *       404:
 *         description: Resource not found
 */
router.get('/:resourceType/:resourceId', PermissionController.list);

/**
 * @swagger
 * /api/v1/permissions/{resourceType}/{resourceId}/me:
 *   get:
 *     summary: Get my effective permissions
 *     description: |
 *       Returns a boolean map of all 13 operations for the calling user on the
 *       given resource. Takes into account direct permissions, group memberships,
 *       and ancestor folder inheritance. Safe to call for any authenticated user.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [file, folder]
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Effective permission map
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
 *                   example: Effective permissions retrieved
 *                 data:
 *                   $ref: '#/components/schemas/EffectivePermissions'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Resource not found
 *       410:
 *         description: Resource is in the trash
 */
router.get('/:resourceType/:resourceId/me', PermissionController.getMyPermissions);

/**
 * @swagger
 * /api/v1/permissions/{resourceType}/{resourceId}/{permissionId}:
 *   patch:
 *     summary: Update a permission
 *     description: |
 *       Update the `role` or `customOps` of an existing permission entry.
 *       Requires **canManagePermissions** on the resource.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [file, folder]
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePermissionInput'
 *     responses:
 *       200:
 *         description: Permission updated
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
 *                   example: Permission updated
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canManagePermissions on this resource
 *       404:
 *         description: Resource or permission not found
 */
router.patch('/:resourceType/:resourceId/:permissionId', PermissionController.update);

/**
 * @swagger
 * /api/v1/permissions/{resourceType}/{resourceId}/{permissionId}:
 *   delete:
 *     summary: Revoke a permission
 *     description: |
 *       Permanently removes a permission entry from a resource.
 *       Requires **canManagePermissions** on the resource.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [file, folder]
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Permission revoked
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
 *                   example: Permission revoked
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissionId:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Caller does not have canManagePermissions on this resource
 *       404:
 *         description: Resource or permission not found
 */
router.delete('/:resourceType/:resourceId/:permissionId', PermissionController.revoke);

/**
 * @swagger
 * components:
 *   schemas:
 *     GrantPermissionInput:
 *       type: object
 *       required:
 *         - role
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: Target user UUID (provide userId OR groupId, not both)
 *         groupId:
 *           type: string
 *           format: uuid
 *           description: Target group UUID (provide userId OR groupId, not both)
 *         role:
 *           type: string
 *           enum: [OWNER, MANAGER, EDITOR, CONTRIBUTOR, VIEWER, CUSTOM]
 *           example: EDITOR
 *         customOps:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - canView
 *               - canDownload
 *               - canUpload
 *               - canEdit
 *               - canRename
 *               - canMove
 *               - canCopy
 *               - canDelete
 *               - canRestore
 *               - canCompress
 *               - canExtract
 *               - canShare
 *               - canManagePermissions
 *           description: Required when role is CUSTOM
 *
 *     UpdatePermissionInput:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [OWNER, MANAGER, EDITOR, CONTRIBUTOR, VIEWER, CUSTOM]
 *         customOps:
 *           type: array
 *           items:
 *             type: string
 *           description: Required when role is CUSTOM
 *
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [OWNER, MANAGER, EDITOR, CONTRIBUTOR, VIEWER, CUSTOM]
 *           example: EDITOR
 *         customOps:
 *           type: array
 *           items:
 *             type: string
 *           example: []
 *         userId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         groupId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         fileId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         folderId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         user:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               nullable: true
 *             email:
 *               type: string
 *             username:
 *               type: string
 *         group:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     EffectivePermissions:
 *       type: object
 *       description: Boolean map of all operations for the calling user on a resource
 *       properties:
 *         canView:
 *           type: boolean
 *         canDownload:
 *           type: boolean
 *         canUpload:
 *           type: boolean
 *         canEdit:
 *           type: boolean
 *         canRename:
 *           type: boolean
 *         canMove:
 *           type: boolean
 *         canCopy:
 *           type: boolean
 *         canDelete:
 *           type: boolean
 *         canRestore:
 *           type: boolean
 *         canCompress:
 *           type: boolean
 *         canExtract:
 *           type: boolean
 *         canShare:
 *           type: boolean
 *         canManagePermissions:
 *           type: boolean
 */

export default router;
