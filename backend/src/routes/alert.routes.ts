import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listAlerts, markAsRead, markAllAsRead } from '../controllers/alert.controller';

const router = Router();

router.use(authenticate);

// GET /api/alerts?severity=critical&is_read=false&account_id=uuid
router.get('/', listAlerts);

// PATCH /api/alerts/read-all
router.patch('/read-all', markAllAsRead);

// PATCH /api/alerts/:id/read
router.patch('/:id/read', markAsRead);

export default router;
