import { prisma } from '../lib/prisma';
import axios from 'axios';
import { config } from '../config/env';
import { SubscriptionService } from './subscription.service';
import { NotificationService, NotificationType } from './notification.service';

export interface InitializePaymentData {
  userId: string;
  planId: string;
  email: string;
  firstName: string;
  lastName: string;
  returnUrl?: string;
  durationMonths?: number;
}

export interface VerifyPaymentData {
  txRef: string;
}

export class PaymentService {
  /**
   * Initialize payment with Chapa
   */
  static async initializePayment(data: InitializePaymentData) {
    const {
      userId,
      planId,
      email,
      firstName,
      lastName,
      returnUrl = `${config.clientUrl}/payment/success`,
      durationMonths = 1,
    } = data;

    // Get plan details
    const plan = await prisma.storagePlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('Storage plan not found');
    }

    // Calculate total amount
    const amount = plan.priceETB * durationMonths;

    // Generate unique transaction reference
    const txRef = `NEX-${Date.now()}-${userId.substring(0, 8)}`;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        txRef,
        userId,
        amount,
        currency: 'ETB',
        status: 'PENDING',
        provider: 'CHAPA',
      },
    });

    // Initialize Chapa payment
    try {
      const chapaResponse = await axios.post(
        `${process.env.CHAPA_API_URL || 'https://api.chapa.co/v1'}/transaction/initialize`,
        {
          amount: amount.toString(),
          currency: 'ETB',
          email,
          first_name: firstName,
          last_name: lastName,
          tx_ref: txRef,
          callback_url: `${process.env.API_URL || 'http://localhost:5000'}/api/v1/payments/webhook`,
          return_url: returnUrl,
          customization: {
            title: `NexaDrive ${plan.name} Plan`,
            description: `${durationMonths} month subscription to ${plan.name} plan`,
          },
          meta: {
            userId,
            planId,
            durationMonths,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (chapaResponse.data.status === 'success') {
        return {
          paymentId: payment.id,
          txRef,
          checkoutUrl: chapaResponse.data.data.checkout_url,
          amount,
          currency: 'ETB',
          plan: {
            id: plan.id,
            name: plan.name,
            priceETB: plan.priceETB,
          },
        };
      } else {
        // Update payment status to failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        throw new Error('Failed to initialize payment with Chapa');
      }
    } catch (error: any) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      console.error('Chapa initialization error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to initialize payment'
      );
    }
  }

  /**
   * Verify payment with Chapa
   */
  static async verifyPayment(data: VerifyPaymentData) {
    const { txRef } = data;

    // Get payment record
    const payment = await prisma.payment.findUnique({
      where: { txRef },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
      return {
        status: 'SUCCESS',
        message: 'Payment already verified',
        payment: {
          id: payment.id,
          txRef: payment.txRef,
          amount: payment.amount,
          status: payment.status,
        },
      };
    }

    // Verify with Chapa
    try {
      const chapaResponse = await axios.get(
        `${process.env.CHAPA_API_URL || 'https://api.chapa.co/v1'}/transaction/verify/${txRef}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          },
        }
      );

      const chapaData = chapaResponse.data;

      if (chapaData.status === 'success' && chapaData.data.status === 'success') {
        // Update payment status
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
          },
        });

        // Extract metadata
        const metadata = chapaData.data.meta;
        const planId = metadata?.planId;
        const durationMonths = metadata?.durationMonths || 1;

        if (planId) {
          // Create or upgrade subscription
          try {
            const subscription = await SubscriptionService.createSubscription({
              userId: payment.userId,
              planId,
              durationMonths,
            });

            // Link payment to subscription
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                subscriptionId: subscription.id,
              },
            });

            // Send notification
            await NotificationService.createNotification({
              userId: payment.userId,
              title: 'Payment Successful',
              message: `Your payment of ${payment.amount} ETB was successful. Your ${subscription.plan.name} plan is now active!`,
              type: NotificationType.QUOTA_ALERT,
            });

            return {
              status: 'SUCCESS',
              message: 'Payment verified and subscription activated',
              payment: {
                id: updatedPayment.id,
                txRef: updatedPayment.txRef,
                amount: updatedPayment.amount,
                status: updatedPayment.status,
              },
              subscription: {
                id: subscription.id,
                planName: subscription.plan.name,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
              },
            };
          } catch (subError: any) {
            console.error('Subscription creation error:', subError.message);
            // Payment succeeded but subscription failed
            return {
              status: 'SUCCESS',
              message: 'Payment verified but subscription activation failed',
              payment: {
                id: updatedPayment.id,
                txRef: updatedPayment.txRef,
                amount: updatedPayment.amount,
                status: updatedPayment.status,
              },
              error: subError.message,
            };
          }
        }

        return {
          status: 'SUCCESS',
          message: 'Payment verified successfully',
          payment: {
            id: updatedPayment.id,
            txRef: updatedPayment.txRef,
            amount: updatedPayment.amount,
            status: updatedPayment.status,
          },
        };
      } else {
        // Payment failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
          },
        });

        return {
          status: 'FAILED',
          message: 'Payment verification failed',
          payment: {
            id: payment.id,
            txRef: payment.txRef,
            amount: payment.amount,
            status: 'FAILED',
          },
        };
      }
    } catch (error: any) {
      console.error('Chapa verification error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to verify payment'
      );
    }
  }

  /**
   * Handle Chapa webhook
   */
  static async handleWebhook(payload: any) {
    const { tx_ref, status, meta } = payload;

    if (!tx_ref) {
      throw new Error('Transaction reference is required');
    }

    // Find payment
    const payment = await prisma.payment.findUnique({
      where: { txRef: tx_ref },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status
    const paymentStatus = status === 'success' ? 'SUCCESS' : 'FAILED';

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatus },
    });

    // If payment successful, create subscription
    if (status === 'success' && meta?.planId) {
      try {
        const subscription = await SubscriptionService.createSubscription({
          userId: payment.userId,
          planId: meta.planId,
          durationMonths: meta.durationMonths || 1,
        });

        // Link payment to subscription
        await prisma.payment.update({
          where: { id: payment.id },
          data: { subscriptionId: subscription.id },
        });

        // Send notification
        await NotificationService.createNotification({
          userId: payment.userId,
          title: 'Payment Successful',
          message: `Your subscription to ${subscription.plan.name} plan is now active!`,
          type: NotificationType.QUOTA_ALERT,
        });
      } catch (error) {
        console.error('Webhook subscription creation error:', error);
      }
    }

    return {
      received: true,
      paymentId: payment.id,
      status: paymentStatus,
    };
  }

  /**
   * Get user's payment history
   */
  static async getUserPayments(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: {
              plan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where: { userId } }),
    ]);

    return {
      payments: payments.map(p => ({
        id: p.id,
        txRef: p.txRef,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        createdAt: p.createdAt,
        subscription: p.subscription
          ? {
              id: p.subscription.id,
              planName: p.subscription.plan.name,
              startDate: p.subscription.startDate,
              endDate: p.subscription.endDate,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   */
  static async getPaymentById(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new Error('Unauthorized to view this payment');
    }

    return {
      id: payment.id,
      txRef: payment.txRef,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      subscription: payment.subscription
        ? {
            id: payment.subscription.id,
            planName: payment.subscription.plan.name,
            startDate: payment.subscription.startDate,
            endDate: payment.subscription.endDate,
            status: payment.subscription.status,
          }
        : null,
    };
  }

  /**
   * Get payment statistics (admin)
   */
  static async getPaymentStats() {
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalRevenue,
      revenueByProvider,
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['provider'],
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      total: totalPayments,
      successful: successfulPayments,
      failed: failedPayments,
      pending: pendingPayments,
      revenue: {
        total: totalRevenue._sum.amount || 0,
        byProvider: revenueByProvider.map(p => ({
          provider: p.provider,
          amount: p._sum.amount || 0,
          count: p._count,
        })),
      },
    };
  }
}
