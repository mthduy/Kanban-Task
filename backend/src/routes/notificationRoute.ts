import { Router } from 'express';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';

const router = Router();

// All routes require authentication
router.use(protectedRoute);


router.get('/', getNotifications);

router.put('/mark-all-read', markAllAsRead);

router.put('/:notificationId/read', markAsRead);


export default router;
