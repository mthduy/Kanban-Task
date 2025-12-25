import express from 'express';
import { acceptInvitation } from '../controllers/invitationController.js';

const router = express.Router();

// Accept invitation (requires auth)
router.post('/accept', acceptInvitation);

export default router;
