import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { GroupController } from '../controllers/group.controller';

const router = Router();

// All group routes require authentication
router.use(authenticateUser);

router.post('/', GroupController.create);
router.get('/', GroupController.list);
router.get('/:groupId', GroupController.getById);
router.patch('/:groupId', GroupController.update);
router.delete('/:groupId', GroupController.delete);

router.post('/:groupId/members', GroupController.addMember);
router.delete('/:groupId/members/:memberId', GroupController.removeMember);
router.patch('/:groupId/members/:memberId/role', GroupController.updateMemberRole);

export default router;
