import cron from 'node-cron';
import { ReminderService } from '../services/reminderService.js';

export class ReminderScheduler {
  private static isSchedulerRunning = false;
  private static scheduledTasks: cron.ScheduledTask[] = [];

  /**
   * Start the due date reminder scheduler
   * Runs daily at 8:00 AM to check for cards due tomorrow
   */
  static start(): void {
    if (this.isSchedulerRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    // Run every day at 8:00 AM
    const dailyTask = cron.schedule('0 8 * * *', async () => {
      console.log('Running daily due date reminder check...');
      try {
        await ReminderService.checkDueReminders();
        console.log('Daily due date reminder check completed');
      } catch (error) {
        console.error('Error running daily due date reminder check:', error);
      }
    }, {
      timezone: 'Asia/Ho_Chi_Minh'
    });

    // Optional: Run every 2 hours during business hours (8 AM - 6 PM) for more frequent checks
    const frequentTask = cron.schedule('0 */2 8-18 * * *', async () => {
      console.log('Running frequent due date reminder check...');
      try {
        await ReminderService.checkDueReminders();
        console.log('Frequent due date reminder check completed');
      } catch (error) {
        console.error('Error running frequent due date reminder check:', error);
      }
    }, {
      timezone: 'Asia/Ho_Chi_Minh'
    });

    this.scheduledTasks.push(dailyTask, frequentTask);

    this.isSchedulerRunning = true;
    console.log('Due date reminder scheduler started');
  }

  /**
   * Stop the reminder scheduler (for testing or maintenance)
   */
  static stop(): void {
    this.scheduledTasks.forEach(task => task.destroy());
    this.scheduledTasks = [];
    this.isSchedulerRunning = false;
    console.log('Reminder scheduler stopped');
  }

  /**
   * Run reminder check immediately (for testing purposes)
   */
  static async runImmediately(): Promise<void> {
    console.log('Running immediate due date reminder check...');
    try {
      await ReminderService.checkDueReminders();
      console.log('Immediate due date reminder check completed');
    } catch (error) {
      console.error('Error running immediate due date reminder check:', error);
    }
  }
}