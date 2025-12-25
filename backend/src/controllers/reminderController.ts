import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ReminderService } from '../services/reminderService.js';
import { ReminderScheduler } from '../schedulers/reminderScheduler.js';

/**
 * GET /api/reminders/upcoming
 * Get upcoming due cards for the current user
 */
export const getUpcomingCards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { days = 1, includeCompleted = 'true' } = req.query; // Default to include completed
    const daysAhead = Math.max(1, Math.min(30, parseInt(days as string) || 1));
    const includeCompletedCards = (includeCompleted as string).toLowerCase() === 'true';

    const upcomingCards = await ReminderService.getCardsDueForUser(
      new mongoose.Types.ObjectId(userId),
      daysAhead,
      includeCompletedCards
    );

    return res.status(200).json({
      cards: upcomingCards,
      count: upcomingCards.length,
      message: `Tìm thấy ${upcomingCards.length} thẻ sắp đến hạn trong ${daysAhead} ngày tới`,
    });
  } catch (error) {
    console.error('getUpcomingCards error:', error);
    return next(error);
  }
};

/**
 * POST /api/reminders/check
 * Manually trigger due reminder check (for testing or admin purposes)
 */
export const getDueReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // You might want to add admin check here
    // For now, any authenticated user can trigger the check

    await ReminderScheduler.runImmediately();

    return res.status(200).json({
      message: 'Kiểm tra nhắc hạn đã được thực hiện thành công',
    });
  } catch (error) {
    console.error('getDueReminders error:', error);
    return next(error);
  }
};

/**
 * POST /api/reminders/send/:cardId
 * Send manual reminder for a specific card
 */
export const sendManualReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!mongoose.isValidObjectId(cardId)) {
      return res.status(400).json({ message: 'Invalid card ID' });
    }

    const success = await ReminderService.sendImmediateDueReminder(
      new mongoose.Types.ObjectId(cardId)
    );

    if (!success) {
      return res.status(400).json({
        message: 'Không thể gửi nhắc nhở. Thẻ có thể đã hoàn thành hoặc không sắp đến hạn.',
      });
    }

    return res.status(200).json({
      message: 'Nhắc nhở đã được gửi thành công',
    });
  } catch (error) {
    console.error('sendManualReminder error:', error);
    return next(error);
  }
};

/**
 * GET /api/reminders/debug-all
 * Debug all cards to see membership issues
 */
export const debugAllCards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { Card } = await import('../models/Card.js');
    
    // Get ALL cards (not filtered by user)
    const allCards = await Card.find({})
      .populate('boardId', 'title')
      .populate('listId', 'title')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });

    const cardAnalysis = allCards.map(card => {
      const isUserMember = card.members.some((member: any) => 
        member._id?.toString() === userId.toString()
      );

      return {
        _id: card._id,
        title: card.title,
        boardTitle: (card.boardId as any)?.title,
        dueDate: card.dueDate,
        completed: card.completed,
        _destroy: card._destroy,
        members: card.members.map((m: any) => ({
          _id: m._id,
          username: m.username,
          email: m.email
        })),
        isUserMember,
        hasDueDate: !!card.dueDate
      };
    });

    console.log(`=== End Debug ===\n`);

    return res.status(200).json({
      userId,
      totalCards: allCards.length,
      userMemberCards: cardAnalysis.filter(c => c.isUserMember).length,
      cardsWithDueDate: cardAnalysis.filter(c => c.hasDueDate).length,
      cards: cardAnalysis,
    });
  } catch (error) {
    console.error('debugAllCards error:', error);
    return next(error);
  }
};

export default {
  getUpcomingCards,
  getDueReminders,
  sendManualReminder,
  debugAllCards,
};