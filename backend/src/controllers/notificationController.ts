import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { emitToUser } from '../socket.js';

// GET all notifications for current user
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) 
        return res.status(401).json({ message: 'Unauthorized' });

    const { unreadOnly } = req.query;

    const filter: Record<string, unknown> = { recipient: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'displayName username avatarUrl')
      .populate('relatedWorkspace', 'name')
      .populate('relatedBoard', 'title')
      .populate('relatedCard', 'title');

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      notifications,
      unreadCount,
      message: 'Lấy thông báo thành công',
    });
  } catch (err) {
    console.error('getNotifications error', err);
    return next(err);
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?._id;

    if (!userId)
         return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      notification,
      message: 'Đã đánh dấu đã đọc',
    });
  } catch (err) {
    console.error('markAsRead error', err);
    return next(err);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

    return res.status(200).json({
      message: 'Đã đánh dấu tất cả là đã đọc',
    });
  } catch (err) {
    console.error('markAllAsRead error', err);
    return next(err);
  }
};

// Create notification helper function
export const createNotification = async (data: {
  recipient: string | mongoose.Types.ObjectId;
  sender: string | mongoose.Types.ObjectId;
  type:
    | 'workspace_invite'
    | 'workspace_remove'
    | 'workspace_deleted'
    | 'board_invitation'
    | 'board_member_added'
    | 'board_member_removed'
    | 'board_member_left'
    | 'board_deleted'
    | 'card_assigned'
    | 'card_moved'
    | 'card_deleted'
    | 'card_comment'
    | 'board_shared'
    | 'list_created'
    | 'list_updated'
    | 'list_deleted'
    | 'card_renamed'
    | 'card_due_reminder';
  message: string;
  relatedWorkspace?: string | mongoose.Types.ObjectId;
  relatedBoard?: string | mongoose.Types.ObjectId;
  relatedCard?: string | mongoose.Types.ObjectId;
}) => {
  try {
    const notification = await Notification.create({
      recipient: typeof data.recipient === 'string' 
        ? new mongoose.Types.ObjectId(data.recipient) 
        : data.recipient,
      sender: typeof data.sender === 'string' 
        ? new mongoose.Types.ObjectId(data.sender) 
        : data.sender,
      type: data.type,
      message: data.message,
      relatedWorkspace: data.relatedWorkspace 
        ? (typeof data.relatedWorkspace === 'string' 
          ? new mongoose.Types.ObjectId(data.relatedWorkspace) 
          : data.relatedWorkspace)
        : undefined,
      relatedBoard: data.relatedBoard 
        ? (typeof data.relatedBoard === 'string' 
          ? new mongoose.Types.ObjectId(data.relatedBoard) 
          : data.relatedBoard)
        : undefined,
      relatedCard: data.relatedCard 
        ? (typeof data.relatedCard === 'string' 
          ? new mongoose.Types.ObjectId(data.relatedCard) 
          : data.relatedCard)
        : undefined,
      isRead: false,
    });
    
    // Populate and emit socket event
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'displayName username avatarUrl')
      .populate('relatedWorkspace', 'name')
      .populate('relatedBoard', 'title')
      .populate('relatedCard', 'title');
    
    console.log('📨 Emitting notification:', {
      recipientId: String(data.recipient),
      type: data.type,
      notificationId: notification._id
    });
    
    if (populatedNotification) {
      emitToUser(String(data.recipient), 'notification-created', { notification: populatedNotification });
    }
    
    return notification;
  } catch (err) {
    console.error('createNotification error', err);
    return null;
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};
