import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { PlanController } from '../controllers/plan.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Storage Plans
 *   description: Storage plan management and pricing
 */

/**
 * @swagger
 * /api/v1/plans:
 *   get:
 *     summary: Get all storage plans
 *     tags: [Storage Plans]
 *     responses:
 *       200:
 *         description: Storage plans retrieved successfully
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
 *                       name:
 *                         type: string
 *                       priceETB:
 *                         type: number
 *                       quotaGB:
 *                         type: number
 *                       isDefault:
 *                         type: boolean
 *                       subscriberCount:
 *                         type: integer
 */
router.get('/', PlanController.getAllPlans);

/**
 * @swagger
 * /api/v1/plans/default:
 *   get:
 *     summary: Get default storage plan
 *     tags: [Storage Plans]
 *     responses:
 *       200:
 *         description: Default plan retrieved successfully
 *       404:
 *         description: No default plan configured
 */
router.get('/default', PlanController.getDefaultPlan);

/**
 * @swagger
 * /api/v1/plans/{planId}:
 *   get:
 *     summary: Get storage plan by ID
 *     tags: [Storage Plans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Plan retrieved successfully
 *       404:
 *         description: Plan not found
 */
router.get('/:planId', PlanController.getPlanById);

// Admin routes
router.use(authenticateUser, requireAdmin);

/**
 * @swagger
 * /api/v1/plans:
 *   post:
 *     summary: Create new storage plan (Admin only)
 *     tags: [Storage Plans]
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
 *               - priceETB
 *               - quotaGB
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium
 *               priceETB:
 *                 type: number
 *                 example: 199
 *               quotaGB:
 *                 type: number
 *                 example: 100
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Plan created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin privileges required
 */
router.post('/', PlanController.createPlan);

/**
 * @swagger
 * /api/v1/plans/{planId}:
 *   put:
 *     summary: Update storage plan (Admin only)
 *     tags: [Storage Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
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
 *               name:
 *                 type: string
 *               priceETB:
 *                 type: number
 *               quotaGB:
 *                 type: number
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       404:
 *         description: Plan not found
 */
router.put('/:planId', PlanController.updatePlan);

/**
 * @swagger
 * /api/v1/plans/{planId}:
 *   delete:
 *     summary: Delete storage plan (Admin only)
 *     tags: [Storage Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Plan deleted successfully
 *       400:
 *         description: Cannot delete plan with active subscriptions
 *       404:
 *         description: Plan not found
 */
router.delete('/:planId', PlanController.deletePlan);

/**
 * @swagger
 * /api/v1/plans/seed/defaults:
 *   post:
 *     summary: Seed default storage plans (Admin only)
 *     tags: [Storage Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default plans created successfully
 */
router.post('/seed/defaults', PlanController.seedPlans);

export default router;
