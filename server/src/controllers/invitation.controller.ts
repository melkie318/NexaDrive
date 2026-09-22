import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { InvitationService } from '../services/invitation.service';
import { createInvitationSchema } from '../validations/invitation.validation';

/**
 * @swagger
 * tags:
 *   name: Invitations
 *   description: Email-based resource invitations
 */

export class InvitationController {
  /**
   * @swagger
   * /api/v1/invitations:
   *   post:
   *     summary: Send an invitation to share a resource via email
   *     tags: [Invitations]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [inviteeEmail, role]
   *             properties:
   *               fileId:
   *                 type: string
   *               folderId:
   *                 type: string
   *               inviteeEmail:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [VIEWER, EDITOR, OWNER, MANAGER, CONTRIBUTOR]
   *               expiresAt:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       201:
   *         description: Invitation sent successfully
   */
  static createInvitation = asyncHandler(async (req: Request, res: Response) => {
    const data = createInvitationSchema.parse(req.body);
    const invitation = await InvitationService.invite(req.user!.id, data);
    return sendResponse(res, {
      statusCode: 201,
      message: 'Invitation sent successfully',
      data: invitation,
    });
  });

  /**
   * @swagger
   * /api/v1/invitations/sent:
   *   get:
   *     summary: List all invitations I have sent
   *     tags: [Invitations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Invitations retrieved successfully
   */
  static listSent = asyncHandler(async (req: Request, res: Response) => {
    const invitations = await InvitationService.listSent(req.user!.id);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Invitations retrieved successfully',
      data: invitations,
    });
  });

  /**
   * @swagger
   * /api/v1/invitations/received:
   *   get:
   *     summary: List all invitations sent to me
   *     tags: [Invitations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Invitations retrieved successfully
   */
  static listReceived = asyncHandler(async (req: Request, res: Response) => {
    const invitations = await InvitationService.listReceived(req.user!.id);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Invitations retrieved successfully',
      data: invitations,
    });
  });

  /**
   * @swagger
   * /api/v1/invitations/{invitationId}/accept:
   *   post:
   *     summary: Accept an invitation
   *     tags: [Invitations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invitationId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Invitation accepted successfully
   */
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const invitation = await InvitationService.accept(req.user!.id, req.params.invitationId as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Invitation accepted successfully',
      data: invitation,
    });
  });

  /**
   * @swagger
   * /api/v1/invitations/{invitationId}/decline:
   *   post:
   *     summary: Decline an invitation
   *     tags: [Invitations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invitationId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Invitation declined successfully
   */
  static declineInvitation = asyncHandler(async (req: Request, res: Response) => {
    const invitation = await InvitationService.decline(req.user!.id, req.params.invitationId as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Invitation declined successfully',
      data: invitation,
    });
  });

  /**
   * @swagger
   * /api/v1/invitations/{invitationId}/cancel:
   *   post:
   *     summary: Cancel an invitation (inviter only)
   *     tags: [Invitations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invitationId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Invitation cancelled successfully
   */
  static cancelInvitation = asyncHandler(async (req: Request, res: Response) => {
    const result = await InvitationService.cancel(req.user!.id, req.params.invitationId as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Invitation cancelled successfully',
      data: result,
    });
  });
}
