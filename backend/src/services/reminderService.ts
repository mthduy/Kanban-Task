import { Card } from '../models/Card.js';
import { createNotification } from '../controllers/notificationController.js';
import mongoose from 'mongoose';

export class ReminderService {
  /**
   * Check for cards due tomorrow and send notifications
   * This method should be called daily (e.g., via cron job)
   */
  static async checkDueReminders(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find cards due tomorrow that are not completed and not destroyed
      const cardsQuery = Card.find({
        dueDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow
        },
        completed: false,
        _destroy: false
      }).populate('members boardId', 'displayName username avatarUrl title');

      const cardsDueTomorrow = await cardsQuery.exec();

      console.log(`Found ${cardsDueTomorrow.length} cards due tomorrow`);

      // Send notification to each member of each card
      for (const card of cardsDueTomorrow) {
        if (!card.members || card.members.length === 0) {
          continue;
        }

        for (const member of card.members) {
          const memberId = typeof member === 'object' && 'displayName' in member 
            ? member._id as mongoose.Types.ObjectId
            : member as mongoose.Types.ObjectId;

          // Check if notification already sent today for this card and user
          const existingNotification = await this.checkExistingNotification(
            memberId, 
            card._id as mongoose.Types.ObjectId
          );

          if (!existingNotification) {
            const senderId = card.createdBy ? card.createdBy as mongoose.Types.ObjectId : memberId;
            
            await createNotification({
              recipient: memberId,
              sender: senderId,
              type: 'card_due_reminder',
              message: `Thẻ "${card.title}" sẽ đến hạn vào ngày mai`,
              relatedCard: card._id as mongoose.Types.ObjectId,
              relatedBoard: card.boardId as mongoose.Types.ObjectId,
            });

            console.log(`Sent due reminder for card "${card.title}" to user ${memberId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in checkDueReminders:', error);
    }
  }

  /**
   * Check if a due reminder notification already exists today for a specific card and user
   */
  private static async checkExistingNotification(
    userId: mongoose.Types.ObjectId,
    cardId: mongoose.Types.ObjectId
  ): Promise<boolean> {
    const { Notification } = await import('../models/Notification.js');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingNotification = await Notification.findOne({
      recipient: userId,
      relatedCard: cardId,
      type: 'card_due_reminder',
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    return !!existingNotification;
  }

  /**
   * Send immediate due reminder for a specific card (manual trigger)
   */
  static async sendImmediateDueReminder(cardId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const card = await Card.findById(cardId).populate('members boardId');
      
      if (!card || card._destroy) {
        console.log('Card not found or destroyed:', cardId);
        return false;
      }

      // For manual reminders, allow sending for any card with a due date (not just within 24 hours)
      if (!card.dueDate) {
        console.log('Card has no due date:', cardId);
        return false;
      }

      console.log(`Sending manual reminder for card: ${card.title}, due: ${card.dueDate}, completed: ${card.completed}`);

      for (const member of card.members) {
        const memberId = typeof member === 'object' && 'displayName' in member 
          ? member._id as mongoose.Types.ObjectId
          : member as mongoose.Types.ObjectId;

        const senderId = card.createdBy ? card.createdBy as mongoose.Types.ObjectId : memberId;
        
        await createNotification({
          recipient: memberId,
          sender: senderId,
          type: 'card_due_reminder',
          message: `Nhắc nhở: Thẻ "${card.title}" ${card.completed ? 'đã hoàn thành nhưng' : ''} sắp đến hạn vào ${card.dueDate.toLocaleDateString('vi-VN')}`,
          relatedCard: card._id as mongoose.Types.ObjectId,
          relatedBoard: card.boardId as mongoose.Types.ObjectId,
        });
      }

      return true;
    } catch (error) {
      console.error('Error in sendImmediateDueReminder:', error);
      return false;
    }
  }

  /**
   * Get all cards due within specified days for a user
   */
  static async getCardsDueForUser(
    userId: mongoose.Types.ObjectId, 
    daysAhead: number = 1,
    includeCompleted: boolean = true // Default to true
  ): Promise<any[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      console.log(`\n=== getCardsDueForUser Debug ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Days ahead: ${daysAhead}`);
      console.log(`Include completed: ${includeCompleted}`);
      console.log(`Date range: ${now.toISOString()} to ${futureDate.toISOString()}`);

      // Simplified query - just filter by date and user, not completion status by default
      const queryConditions: any = {
        members: userId,
        dueDate: {
          $gte: now,
          $lte: futureDate
        },
        _destroy: false
      };

      // Only filter out completed if explicitly requested
      if (!includeCompleted) {
        queryConditions.completed = false;
      }

      const cards = await Card.find(queryConditions)
        .populate('boardId', 'title')
        .populate('listId', 'title')
        .sort({ completed: 1, dueDate: 1 }); // Sort incomplete first, then by due date

      console.log(`\nFinal filtered cards: ${cards.length}`);
      cards.forEach((card, i) => {
        console.log(`${i+1}. "${card.title}" - Due: ${card.dueDate?.toISOString()} - Completed: ${card.completed}`);
      });
      console.log(`=== End Debug ===\n`);

      return cards;
    } catch (error) {
      console.error('Error in getCardsDueForUser:', error);
      return [];
    }
  }
}