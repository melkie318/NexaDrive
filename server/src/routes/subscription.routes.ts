import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { SubscriptionController } from '../controllers/subscription.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription lifecycle management
 */

// All routes require authentication
router.use(authenticateUser);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Create new subscription
 *     description: Usually called after successful payment
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *               durationMonths:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 default: 1
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: User already has active subscription
 *       404:
 *         description: Plan not found
 */
router.post('/', SubscriptionController.createSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/current:
 *   get:
 *     summary: Get current active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
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
 *                     planId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     plan:
 *                       type: object
 *       404:
 *         description: No active subscription found
 */
router.get('/current', SubscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/history:
 *   get:
 *     summary: Get subscription history
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully
 */
router.get('/history', SubscriptionController.getSubscriptionHistory);

/**
 * @swagger
 * /api/v1/subscriptions/{subscriptionId}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 *       400:
 *         description: Subscription not active
 *       403:
 *         description: Unauthorized to cancel this subscription
 *       404:
 *         description: Subscription not found
 */
router.post('/:subscriptionId/cancel', SubscriptionController.cancelSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/upgrade:
 *   post:
 *     summary: Upgrade to higher plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPlanId
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       400:
 *         description: Invalid upgrade (new plan must have more storage)
 *       404:
 *         description: No active subscription or new plan not found
 */
router.post('/upgrade', SubscriptionController.upgradeSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/{subscriptionId}/renew:
 *   post:
 *     summary: Renew subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
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
 *               durationMonths:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 default: 1
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
router.post('/:subscriptionId/renew', SubscriptionController.renewSubscription);

// Admin routes
/**
 * @swagger
 * /api/v1/subscriptions/stats:
 *   get:
 *     summary: Get subscription statistics (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription statistics retrieved successfully
 *       403:
 *         description: Admin privileges required
 */
router.get('/stats', requireAdmin, SubscriptionController.getSubscriptionStats);

/**
 * @swagger
 * /api/v1/subscriptions/check-expired:
 *   post:
 *     summary: Check and expire subscriptions (Admin/Cron)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expiry check completed
 *       403:
 *         description: Admin privileges required
 */
router.post('/check-expired', requireAdmin, SubscriptionController.checkExpiredSubscriptions);

export default router;
