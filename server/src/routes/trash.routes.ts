import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { TrashController } from '../controllers/trash.controller';

const router = Router();

// All trash routes require authentication
router.use(authenticateUser);

router.post('/', TrashController.moveToTrash);
router.get('/', TrashController.listTrash);
router.post('/:trashItemId/restore', TrashController.restore);
router.delete('/:trashItemId', TrashController.permanentDelete);
router.delete('/empty/all', TrashController.emptyTrash);

export default router;
