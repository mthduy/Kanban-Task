import express from 'express';
import { getDueReminders, sendManualReminder, getUpcomingCards, debugAllCards } from '../controllers/reminderController.js';

const router = express.Router();

// GET /api/reminders/upcoming - Get upcoming due cards for current user
router.get('/upcoming', getUpcomingCards);

// GET /api/reminders/debug-all - Debug all cards to see membership
router.get('/debug-all', debugAllCards);

// GET /api/reminders/check - Manually trigger due reminder check (admin only)
router.post('/check', getDueReminders);

// POST /api/reminders/send/:cardId - Send manual reminder for specific card
router.post('/send/:cardId', sendManualReminder);

export default router;