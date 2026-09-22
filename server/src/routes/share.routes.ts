import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { ShareController } from '../controllers/share.controller';

const router = Router();

// All share routes require authentication
router.use(authenticateUser);

router.post('/direct', ShareController.createDirectShare);
router.post('/group', ShareController.createGroupShare);
router.get('/my', ShareController.listMyShares);
router.get('/with-me', ShareController.listSharedWithMe);
router.delete('/:shareId', ShareController.revokeShare);

export default router;
