import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { InvitationController } from '../controllers/invitation.controller';

const router = Router();

// All invitation routes require authentication
router.use(authenticateUser);

router.post('/', InvitationController.createInvitation);
router.get('/sent', InvitationController.listSent);
router.get('/received', InvitationController.listReceived);
router.post('/:invitationId/accept', InvitationController.acceptInvitation);
router.post('/:invitationId/decline', InvitationController.declineInvitation);
router.post('/:invitationId/cancel', InvitationController.cancelInvitation);

export default router;
