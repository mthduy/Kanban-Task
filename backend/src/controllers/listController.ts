import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { List } from '../models/List.js';
import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import type { UpdateListPayload } from '../types/listTypes.js';
import type { IUser } from '../models/User.js';
import User from '../models/User.js';
import { checkBoardAccess, checkBoardAccessViaList } from '../utils/checkBoardAccess.js';
import { createNotification } from './notificationController.js';
import { emitToBoardRoom } from '../socket.js';

export const getListsByBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.isValidObjectId(boardId))
        return res.status(400).json({ message: 'Invalid board id' });
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ message: 'Unauthorized' });

    // AUTHORIZATION CHECK: Verify user has access to this board
    const accessCheck = await checkBoardAccess(String(boardId), String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }
    // Sort lists by createdAt ascending (oldest first) so newest items are last
    const lists = await List.find({ boardId }).sort({ createdAt: 1 });
    return res.status(200).json({ lists });
  } catch (err) {
    console.error('getListsByBoard error', err);
    return next(err);
  }
};


export const createList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    const { title } = req.body;
    const userIdRaw = req.user?._id;

    if (!userIdRaw) 
      return res.status(401).json({ message: 'Unauthorized' });

    const userId = String(userIdRaw);

    if (!boardId || !mongoose.isValidObjectId(boardId)) 
      return res.status(400).json({ message: 'Invalid board id' });
    
    if (!title || typeof title !== 'string' || title.trim().length < 1) 
      return res.status(400).json({ message: 'Title is required' });

    // AUTHORIZATION CHECK: Verify user has access to board
    const accessCheck = await checkBoardAccess(boardId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const payload = { title: title.trim(), boardId };

    const doc = await List.create(payload);
    
    // Notify all board members about new list
    const board = await Board.findById(boardId).populate('owner', 'displayName username');
    if (board) {
      const creator = await User.findById(userId).select('displayName username').lean();
      const creatorName = creator?.displayName || creator?.username || 'Một thành viên';
      
      const allMemberIds = new Set([
        String(board.owner._id || board.owner),
        ...(board.members || []).map(String)
      ]);
      allMemberIds.delete(userId); // Don't notify creator
      
      for (const memberId of Array.from(allMemberIds)) {
          await createNotification({
          recipient: memberId,
          sender: userId,
          type: 'list_created',
          message: doc.title,
          relatedBoard: boardId,
        });
      }
    }
    
    // Emit real-time event
    emitToBoardRoom(boardId, 'list-created', { 
      list: doc,
      createdBy: { id: req.user?._id, email: req.user?.email }
    });
    
    return res.status(201).json({ list: doc, message: 'Tạo danh sách thành công' });
  } catch (err) {
    console.error('createList error', err);
    return next(err);
  }
};

export const updateList = async (req: Request<{ listId: string }, never, UpdateListPayload>, res: Response, next: NextFunction) => {
  try {
    const { listId } = req.params;
    const { title } = req.body;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(listId))
       return res.status(400).json({ message: 'Invalid id' });

    // AUTHORIZATION CHECK: Verify user has access to board via list
    const accessCheck = await checkBoardAccessViaList(listId, String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const update: UpdateListPayload = {};
    if (typeof title === 'string') 
      update.title = title.trim();

    const list = await List.findById(listId);
    const oldTitle = list?.title;
    
    const updated = await List.findByIdAndUpdate(listId, { $set: update }, { new: true });
    if (!updated) 
      return res.status(404).json({ message: 'List not found' });
    
    try {
      await Card.updateMany({ listId: updated._id }, { $set: { status: updated.title } });
    } catch (err) {
      console.error('Failed to update card statuses after list title change', err);
    }
    
    // Notify all board members about list update
    if (oldTitle && oldTitle !== updated.title) {
      const board = await Board.findById(updated.boardId);
      if (board) {
        const updater = await User.findById(userId).select('displayName username').lean();
        const updaterName = updater?.displayName || updater?.username || 'Một thành viên';
        
        const allMemberIds = new Set([
          String(board.owner),
          ...(board.members || []).map(String)
        ]);
        allMemberIds.delete(String(userId)); // Don't notify updater
        
        for (const memberId of Array.from(allMemberIds)) {
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'list_updated',
            message: updated.title,
            relatedBoard: String(updated.boardId),
          });
        }
      }
    }
    
    return res.status(200).json({ list: updated, message: 'Cập nhật danh sách thành công' });
  } catch (err) {
    console.error('updateList error', err);
    return next(err);
  }
};


export const deleteList = async (req: Request<{ listId: string }, never, { targetListId?: string }>, res: Response, next: NextFunction) => {
  try {
    const { listId } = req.params;
    const { targetListId } = req.body || {};
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(listId)) 
      return res.status(400).json({ message: 'Invalid id' });

    // AUTHORIZATION CHECK: Verify user has access to board via list
    const accessCheck = await checkBoardAccessViaList(listId, String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const list = accessCheck.list;
    if (!list) 
      return res.status(404).json({ message: 'List not found' });

    // If targetListId is provided, move all cards to that list before deleting
    if (typeof targetListId === 'string' && targetListId.trim().length > 0) {
      if (!mongoose.isValidObjectId(targetListId)) {
        return res.status(400).json({ message: 'Invalid target list id' });
      }
      const target = await List.findById(targetListId);
      if (!target) {
        return res.status(404).json({ message: 'Target list not found' });
      }
      // Ensure both lists belong to the same board
      if (String(target.boardId) !== String(list.boardId)) {
        return res.status(400).json({ message: 'Target list must be in the same board' });
      }
      try {
        // Move cards: update listId and align status to target list title
        await Card.updateMany({ listId: list._id }, { $set: { listId: target._id, status: target.title } });
      } catch (err) {
        console.error('Failed to move cards to target list before deletion', err);
        return next(err);
      }
    }

    await List.findByIdAndDelete(listId);
    
    // Notify all board members about list deletion
    const board = await Board.findById(list.boardId);
    if (board) {
      const deleter = await User.findById(userId).select('displayName username').lean();
      const deleterName = deleter?.displayName || deleter?.username || 'Một thành viên';
      
      const allMemberIds = new Set([
        String(board.owner),
        ...(board.members || []).map(String)
      ]);
      allMemberIds.delete(String(userId)); // Don't notify deleter
      
      for (const memberId of Array.from(allMemberIds)) {
        await createNotification({
          recipient: memberId,
          sender: String(userId),
          type: 'list_deleted',
          message: list.title,
          relatedBoard: String(list.boardId),
        });
      }
    }
    
    return res.status(200).json({ message: 'Xóa danh sách thành công' });
  } catch (err) {
    console.error('deleteList error', err);
    return next(err);
  }
};

export default {
  getListsByBoard,
  createList,
  updateList,
  deleteList,
};
