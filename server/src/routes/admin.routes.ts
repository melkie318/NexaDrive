import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrator-only endpoints for user management, system monitoring, and platform administration
 */

// All admin routes require authentication AND admin role
router.use(authenticateUser);
router.use(requireAdmin);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with pagination and filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search by email, username, or name
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get('/users', AdminController.getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/{userId}:
 *   get:
 *     summary: Get detailed user information by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: User not found
 */
router.get('/users/:userId', AdminController.getUserById);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/role:
 *   put:
 *     summary: Update user role (promote/demote)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *                 description: New role for the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/role', AdminController.updateUserRole);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/status:
 *   put:
 *     summary: Suspend or activate user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Set to false to suspend, true to activate
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/status', AdminController.toggleUserStatus);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/quota:
 *   put:
 *     summary: Update user storage quota
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quotaGB
 *             properties:
 *               quotaGB:
 *                 type: number
 *                 minimum: 0.001
 *                 maximum: 10000
 *                 description: Storage quota in gigabytes (max 10TB)
 *                 example: 100
 *     responses:
 *       200:
 *         description: User quota updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/quota', AdminController.updateUserQuota);

/**
 * @swagger
 * /api/v1/admin/users/{userId}:
 *   delete:
 *     summary: Delete user account permanently
 *     description: Permanently delete a user and all associated data (files, folders, etc.)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Bad request (e.g., trying to delete yourself)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: User not found
 */
router.delete('/users/:userId', AdminController.deleteUser);

/**
 * @swagger
 * /api/v1/admin/stats/system:
 *   get:
 *     summary: Get system-wide statistics
 *     description: Get comprehensive system statistics including users, content, storage, and activity counts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         inactive:
 *                           type: integer
 *                         admins:
 *                           type: integer
 *                     content:
 *                       type: object
 *                       properties:
 *                         files:
 *                           type: integer
 *                         folders:
 *                           type: integer
 *                     storage:
 *                       type: object
 *                       properties:
 *                         totalUsed:
 *                           type: string
 *                         totalUsedGB:
 *                           type: number
 *                     collaboration:
 *                       type: object
 *                       properties:
 *                         groups:
 *                           type: integer
 *                         shares:
 *                           type: integer
 *                     activities:
 *                       type: integer
 *                     recentUsers:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get('/stats/system', AdminController.getSystemStats);

/**
 * @swagger
 * /api/v1/admin/stats/storage:
 *   get:
 *     summary: Get storage statistics breakdown
 *     description: Get detailed storage statistics including top users, file type distribution, and totals
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage statistics retrieved successfully
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
 *                     topUsers:
 *                       type: array
 *                       description: Top 10 users by storage usage
 *                     fileTypes:
 *                       type: array
 *                       description: File type distribution
 *                     totals:
 *                       type: object
 *                       description: Total storage statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get('/stats/storage', AdminController.getStorageStats);

/**
 * @swagger
 * /api/v1/admin/stats/activity:
 *   get:
 *     summary: Get activity statistics
 *     description: Get activity statistics for a specified time period
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Activity statistics retrieved successfully
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
 *                     period:
 *                       type: object
 *                     byAction:
 *                       type: array
 *                       description: Activities grouped by action type
 *                     byDay:
 *                       type: array
 *                       description: Activities grouped by day
 *                     topUsers:
 *                       type: array
 *                       description: Most active users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get('/stats/activity', AdminController.getActivityStats);

/**
 * @swagger
 * /api/v1/admin/activities:
 *   get:
 *     summary: Get recent system activities
 *     description: Get recent activities from all users across the system
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Number of activities to retrieve
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
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
 *                       userId:
 *                         type: string
 *                       action:
 *                         type: string
 *                       details:
 *                         type: string
 *                       ipAddress:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get('/activities', AdminController.getRecentActivities);

/**
 * @swagger
 * /api/v1/admin/cleanup:
 *   post:
 *     summary: Clean up old system data
 *     description: Remove old trash items, activity logs, and expired tokens
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysOld
 *         schema:
 *           type: integer
 *           minimum: 7
 *           maximum: 365
 *           default: 30
 *         description: Delete data older than this many days
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
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
 *                     deletedTrashItems:
 *                       type: integer
 *                     deletedActivities:
 *                       type: integer
 *                     deletedExpiredTokens:
 *                       type: integer
 *                     cutoffDate:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.post('/cleanup', AdminController.cleanupOldData);

export default router;
