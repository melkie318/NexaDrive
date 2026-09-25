import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing with Chapa and Telebirr
 */

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Chapa webhook handler
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/webhook', PaymentController.handleWebhook);

// All other routes require authentication
router.use(authenticateUser);

/**
 * @swagger
 * /api/v1/payments/initialize:
 *   post:
 *     summary: Initialize payment with Chapa
 *     tags: [Payments]
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
 *               - firstName
 *               - lastName
 *               - email
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *               durationMonths:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 default: 1
 *     responses:
 *       201:
 *         description: Payment initialized successfully
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
 *                     paymentId:
 *                       type: string
 *                     txRef:
 *                       type: string
 *                     checkoutUrl:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Plan not found
 */
router.post('/initialize', PaymentController.initializePayment);

/**
 * @swagger
 * /api/v1/payments/verify:
 *   get:
 *     summary: Verify payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: txRef
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction reference
 *     responses:
 *       200:
 *         description: Payment verification result
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
 *                     status:
 *                       type: string
 *                       enum: [SUCCESS, FAILED, PENDING]
 *                     payment:
 *                       type: object
 *                     subscription:
 *                       type: object
 *       404:
 *         description: Payment not found
 */
router.get('/verify', PaymentController.verifyPayment);

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Get user payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', PaymentController.getUserPayments);

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       403:
 *         description: Unauthorized to view this payment
 *       404:
 *         description: Payment not found
 */
router.get('/:paymentId', PaymentController.getPaymentById);

/**
 * @swagger
 * /api/v1/payments/stats:
 *   get:
 *     summary: Get payment statistics (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *       403:
 *         description: Admin privileges required
 */
router.get('/stats', requireAdmin, PaymentController.getPaymentStats);

export default router;
