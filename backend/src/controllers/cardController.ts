import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';
import User from '../models/User.js';
import type { CreateCardBody, UpdateCardBody, UpdateCardPayload } from '../types/cardTypes.js';
import { checkBoardAccessViaList, checkBoardAccessViaCard, checkBoardAccess } from '../utils/checkBoardAccess.js';
import { createNotification } from './notificationController.js';
import { emitToBoardRoom } from '../socket.js';

// GET filtered cards (board-level or list-level)
export const getCards = async (
  req: Request<{ boardId?: string; listId?: string }, never, never, Record<string, string | undefined>>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { boardId, listId } = req.params;
    const authUserId = req.user?._id;
    if (!authUserId) return res.status(401).json({ message: 'Unauthorized' });
    const {
      members,          // comma separated user ids
      statuses,         // comma separated status strings
      completed,        // 'true' | 'false'
      search,           // text search
      labelNames,       // comma separated label names
      labelColors,      // comma separated label colors
      dueDateFrom,      // ISO date string
      dueDateTo,        // ISO date string
      page = '1',
      limit = '30',
      sort = 'createdAt:desc',
      createdFrom,
      createdTo
    } = req.query;

    const filter: Record<string, any> = {};
    if (boardId) {
      if (!mongoose.isValidObjectId(boardId)) 
        return res.status(400).json({ message: 'Invalid board id' });
      filter.boardId = boardId;
    }
    if (listId) {
      if (!mongoose.isValidObjectId(listId)) return res.status(400).json({ message: 'Invalid list id' });
      filter.listId = listId;
    }

    // AUTHORIZATION CHECKS
    if (listId) {
      const accessCheck = await checkBoardAccessViaList(listId, String(authUserId));
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
      }
      // If both boardId and listId provided, ensure they match
      if (boardId && accessCheck.list && String(accessCheck.list.boardId) !== String(boardId)) {
        return res.status(400).json({ message: 'List does not belong to the specified board' });
      }
    } else if (boardId) {
      const accessCheck = await checkBoardAccess(boardId, String(authUserId));
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
      }
    }

    if (statuses && statuses.trim()) {
      const arr = statuses.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length === 1) filter.status = arr[0];
      else if (arr.length) filter.status = { $in: arr };
    }

    if (typeof completed === 'string') {
      if (completed === 'true') filter.completed = true;
      else if (completed === 'false') filter.completed = false;
    }

    if (members && members.trim()) {
      const arr = members.split(',').map(m => m.trim()).filter(m => mongoose.isValidObjectId(m));
      if (arr.length) filter.members = { $in: arr }; // match any member
    }

    const nameArr = labelNames && labelNames.trim() ? labelNames.split(',').map(n => n.trim()).filter(Boolean) : [];
    const colorArr = labelColors && labelColors.trim() ? labelColors.split(',').map(c => c.trim()).filter(Boolean) : [];
    if (nameArr.length || colorArr.length) {
      const elem: Record<string, any> = {};
      if (nameArr.length === 1) elem.name = nameArr[0]; else if (nameArr.length) elem.name = { $in: nameArr };
      if (colorArr.length === 1) elem.color = colorArr[0]; else if (colorArr.length) elem.color = { $in: colorArr };
      filter.labels = { $elemMatch: elem };
    }

    if (dueDateFrom || dueDateTo) {
      const range: Record<string, Date> = {};
      if (dueDateFrom) { const d = new Date(dueDateFrom); if (!isNaN(d.getTime())) range.$gte = d; }
      if (dueDateTo) { const d = new Date(dueDateTo); if (!isNaN(d.getTime())) range.$lte = d; }
      if (Object.keys(range).length) filter.dueDate = range;
    }

    if (search && search.trim()) {
        if (search.length > 100) {
          return res.status(400).json({ message: 'Query too long (max 100 chars)' });
        }
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }

    // createdAt range (for UI time filter)
    if (createdFrom || createdTo) {
      const range: Record<string, Date> = {};
      if (createdFrom) { const d = new Date(createdFrom); if (!isNaN(d.getTime())) range.$gte = d; }
      if (createdTo) { const d = new Date(createdTo); if (!isNaN(d.getTime())) range.$lte = d; }
      if (Object.keys(range).length) filter.createdAt = range;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const [sortFieldRaw, sortDirRaw] = sort.split(':');
    const sortField = sortFieldRaw && ['createdAt', 'updatedAt', 'dueDate', 'title', 'status'].includes(sortFieldRaw)
      ? sortFieldRaw
      : 'createdAt';
    const sortDir: 1 | -1 = sortDirRaw === 'asc' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortDir };

    const skip = (pageNum - 1) * limitNum;
    const [cards, total] = await Promise.all([
      Card.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'displayName username avatarUrl')
        .populate('members', 'displayName username avatarUrl')
        .populate('comments.author', 'displayName username avatarUrl')
        .populate('activities.user', 'displayName username avatarUrl'),
      Card.countDocuments(filter)
    ]);

    return res.status(200).json({
      cards,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      message: 'Lọc thẻ thành công'
    });
  } catch (err) {
    console.error('getCards error', err);
    return next(err);
  }
};

export const createCard = async (req: Request<{ listId: string }, never, CreateCardBody>, res: Response, next: NextFunction) => {
  try {
    const { listId } = req.params;
    const { title, description, position } = req.body;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(listId)) 
      return res.status(400).json({ message: 'Invalid list id' });

    // AUTHORIZATION CHECK: Verify user has access to board via list
    const accessCheck = await checkBoardAccessViaList(listId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const list = accessCheck.list;
    if (!list) 
      return res.status(404).json({ message: 'List not found' });

    const boardId = list.boardId;
    if (!boardId || !mongoose.isValidObjectId(String(boardId))) 
      return res.status(400).json({ message: 'Invalid board id' });
    
    const createdBy = mongoose.isValidObjectId(String(userId)) ? new mongoose.Types.ObjectId(String(userId)) : undefined;

    // derive status from the list title (server authoritative)
    const status = (list.title && typeof list.title === 'string') ? list.title : undefined;

    const doc = await Card.create({
      title,
      description: description || '',
      listId,
      boardId,
      status,
      createdBy
    });

    const populated = await Card.findById(doc._id).populate('createdBy', 'displayName username avatarUrl');
    
    // Emit real-time event
    emitToBoardRoom(String(boardId), 'card-created', { 
      card: populated || doc,
      createdBy: { id: req.user?._id, email: req.user?.email }
    });
    
    return res.status(201).json({ card: populated || doc, message: 'Tạo thẻ thành công' });
  } catch (err) {
    console.error('createCard error', err);
    return next(err);
  }
};

export const getCard = async (req: Request<{ cardId: string }>, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(cardId)) 
      return res.status(400).json({ message: 'Invalid card id' });

    // AUTHORIZATION CHECK: Verify user has access to board via card
    const accessCheck = await checkBoardAccessViaCard(cardId, String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const card = await Card.findById(cardId)
      .populate('createdBy', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl')
      .populate('comments.author', 'displayName username avatarUrl')
      .populate('activities.user', 'displayName username avatarUrl');
    
    if (!card) 
      return res.status(404).json({ message: 'Card not found' });
    
    return res.status(200).json({ card });
  } catch (err) {
    console.error('getCard error', err);
    return next(err);
  }
};

export const updateCard = async (req: Request<{ cardId: string }, never, UpdateCardBody>, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const { title, description, position, listId, completed, members, labels, status: providedStatus } = req.body;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });
    
    if (!mongoose.isValidObjectId(cardId)) 
      return res.status(400).json({ message: 'Invalid card id' });

    // AUTHORIZATION CHECK: Verify user has access to board via card
    const accessCheck = await checkBoardAccessViaCard(cardId, String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    // Get original card for comparison
    const originalCard = await Card.findById(cardId).populate('members', '_id displayName username');
    if (!originalCard) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const update: UpdateCardPayload = {};
    let titleChanged = false;
    let oldTitle = originalCard.title;
    
    if (title !== undefined && title !== originalCard.title) {
      titleChanged = true;
      update.title = title;
    } else if (title !== undefined) {
      update.title = title;
    }
    if (description !== undefined) 
      update.description = description;
    if (position !== undefined) 
      update.position = position;
    
    // Track if card is being moved to different list
    let isMovedToNewList = false;
    let newListTitle = '';
    
    if (listId && mongoose.isValidObjectId(String(listId))) {
      const originalListId = String(originalCard.listId);
      const newListId = String(listId);
      
      if (originalListId !== newListId) {
        isMovedToNewList = true;
        update.listId = new mongoose.Types.ObjectId(String(listId));
        
        // Get target list info for notification
        try {
          const targetList = await List.findById(String(listId));
          if (targetList && typeof targetList.title === 'string') {
            update.status = targetList.title;
            newListTitle = targetList.title;
          }
        } catch (e) {
          // ignore and allow client-provided status or existing status to remain
        }
      }
    }
    // allow explicit status override (nullable) — if provided and not moving list
    if (typeof providedStatus === 'string') 
      update.status = providedStatus;
    if (typeof completed === 'boolean') 
      update.completed = completed;
    
    // Track member changes for notifications
    let addedMembers: string[] = [];
    let removedMembers: string[] = [];
    
    if (Array.isArray(members)) {
      // Zod already validated format (array of valid ObjectId strings)
      const uniqueIds = Array.from(new Set(members.map(m => String(m))));
      if (uniqueIds.length) {
        const existing = await User.find({ _id: { $in: uniqueIds } }, { _id: 1 }).lean();
        const existingSet = new Set(existing.map((u) => String(u._id)));
        const missing = uniqueIds.filter((id) => !existingSet.has(id));
        if (missing.length) {
          return res.status(400).json({ message: 'Some member IDs do not exist', fields: { members: missing } });
        }
      }
      
      // Detect member changes
      const oldMemberIds = (originalCard.members || []).map((m: any) => String(m._id || m));
      const newMemberIds = uniqueIds;
      
      addedMembers = newMemberIds.filter(id => !oldMemberIds.includes(id));
      removedMembers = oldMemberIds.filter(id => !newMemberIds.includes(id));
      
      update.members = uniqueIds.map((s) => new mongoose.Types.ObjectId(s));
    }
    if (Array.isArray(labels)) {
      // Zod already validated format
      update.labels = labels;
    }

    
    // Handle dueDate: accept ISO string or null to remove (Zod validated)
    if (Object.prototype.hasOwnProperty.call(req.body, 'dueDate')) {
      const raw = (req.body as unknown as { dueDate?: string | null }).dueDate;
      if (raw === null) {
        (update as UpdateCardPayload).dueDate = null;
      } else if (typeof raw === 'string') {
        (update as UpdateCardPayload).dueDate = new Date(raw);
      }
    }

    // Handle activity tracking from client
    const activityData = (req.body as unknown as { activity?: { type: string; text: string; metadata?: unknown } }).activity;
    if (activityData && typeof activityData.type === 'string' && typeof activityData.text === 'string') {
      const newActivity = {
        type: activityData.type as 'label' | 'member' | 'update' | 'complete' | 'incomplete' | 'created',
        user: userId && mongoose.isValidObjectId(String(userId)) ? new mongoose.Types.ObjectId(String(userId)) : undefined,
        text: activityData.text.trim(),
        metadata: activityData.metadata || {},
        createdAt: new Date()
      };
      
      // Push activity to array
      (update as Record<string, unknown>).activities = newActivity;
    }

    // Build update operations. If dueDate explicitly null, $unset it instead of setting null.
    const updateOps: Record<string, any> = {};
    if (Object.prototype.hasOwnProperty.call(update, 'dueDate') && (update as UpdateCardPayload).dueDate === null) {
      const { dueDate, activities, ...rest } = update as Partial<Record<string, unknown>>;
      if (Object.keys(rest).length) updateOps['$set'] = rest;
      updateOps['$unset'] = { dueDate: '' };
      if (activities) updateOps['$push'] = { activities };
    } else {
      const { activities, ...rest } = update as Partial<Record<string, unknown>>;
      if (Object.keys(rest).length) updateOps['$set'] = rest;
      if (activities) updateOps['$push'] = { activities };
    }

    const updated = await Card.findByIdAndUpdate(cardId, updateOps, { new: true })
      .populate('createdBy', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl')
      .populate('comments.author', 'displayName username avatarUrl')
      .populate('activities.user', 'displayName username avatarUrl')
      // .populate('listId', 'title');
    if (!updated) 
      return res.status(404).json({ message: 'Card not found' });
    
    // Send notifications after successful update
    const currentUser = req.user;
    
    // 1. Notify about card movement to new list
    if (isMovedToNewList && newListTitle) {
      const oldList = await List.findById(String(originalCard.listId));
      const oldListTitle = oldList?.title || 'Unknown';
      
      console.log('📦 Card moved - checking members:', {
        cardTitle: updated.title,
        members: updated.members,
        createdBy: updated.createdBy,
        currentUserId: String(userId)
      });
      
      // Get all members to notify (card members + card creator, excluding current user)
      const recipientIds = new Set<string>();
      if (updated.members) {
        updated.members.forEach((m: any) => {
          const memberId = String(m._id || m);
          if (memberId !== String(userId)) {
            recipientIds.add(memberId);
          }
        });
      }
      if (updated.createdBy && String((updated.createdBy as any)._id) !== String(userId)) {
        recipientIds.add(String((updated.createdBy as any)._id));
      }
      
      console.log('📧 Recipients to notify:', Array.from(recipientIds));
      
      // Send notification to all recipients
      for (const recipientId of recipientIds) {
        await createNotification({
          recipient: new mongoose.Types.ObjectId(recipientId),
          sender: new mongoose.Types.ObjectId(String(userId)),
          type: 'card_moved',
          message: `đã di chuyển thẻ "${updated.title}" từ "${oldListTitle}" sang "${newListTitle}"`,
          relatedCard: updated._id as mongoose.Types.ObjectId,
          relatedBoard: updated.boardId as mongoose.Types.ObjectId
        });
      }
    }
    
    // 2. Notify newly added members
    if (addedMembers.length > 0) {
      const addedMemberNames = await User.find({ _id: { $in: addedMembers } })
        .select('displayName username')
        .lean();
      const addedNames = addedMemberNames.map(u => u.displayName || u.username).join(', ');
      
      // Notify the newly added members
      for (const memberId of addedMembers) {
        if (memberId !== String(userId)) {
          await createNotification({
            recipient: new mongoose.Types.ObjectId(memberId),
            sender: new mongoose.Types.ObjectId(String(userId)),
            type: 'card_assigned',
            message: updated.title,
            relatedCard: updated._id as mongoose.Types.ObjectId,
            relatedBoard: updated.boardId as mongoose.Types.ObjectId
          });
        }
      }
      
      // Also notify existing members about new members being added
      const existingMemberIds = (updated.members || [])
        .map((m: any) => String(m._id || m))
        .filter((id: string) => !addedMembers.includes(id) && id !== String(userId));
      
      for (const memberId of existingMemberIds) {
        await createNotification({
          recipient: new mongoose.Types.ObjectId(memberId),
          sender: new mongoose.Types.ObjectId(String(userId)),
          type: 'card_assigned',
          message: updated.title,
          relatedCard: updated._id as mongoose.Types.ObjectId,
          relatedBoard: updated.boardId as mongoose.Types.ObjectId
        });
      }
    }
    
    // 3. Notify all members when card title is changed
    if (titleChanged && updated.title !== oldTitle) {
      const allMemberIds = (updated.members || [])
        .map((m: any) => String(m._id || m))
        .filter((id: string) => id !== String(userId));
      
      for (const memberId of allMemberIds) {
        await createNotification({
          recipient: new mongoose.Types.ObjectId(memberId),
          sender: new mongoose.Types.ObjectId(String(userId)),
          type: 'card_renamed',
          message: updated.title,
          relatedCard: updated._id as mongoose.Types.ObjectId,
          relatedBoard: updated.boardId as mongoose.Types.ObjectId
        });
      }
    }
    
    // Emit real-time event
    emitToBoardRoom(String(updated.boardId), 'card-updated', { 
      card: updated,
      action: 'update',
      updatedBy: { id: req.user?._id, email: req.user?.email }
    });
    
    return res.status(200).json({ card: updated, message: 'Cập nhật thẻ thành công' });
  } catch (err) {
    console.error('updateCard error', err);
    return next(err);
  }
};

export const deleteCard = async (req: Request<{ cardId: string }, never, never>, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(cardId)) 
      return res.status(400).json({ message: 'Invalid id' });

    // AUTHORIZATION CHECK: Verify user has access to board via card
    const accessCheck = await checkBoardAccessViaCard(cardId, String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const card = accessCheck.card;
    if (!card) 
      return res.status(404).json({ message: 'Card not found' });

    // Notify all members before deleting
    const recipientIds = new Set<string>();
    if (card.members) {
      card.members.forEach((m: any) => {
        const memberId = String(m._id || m);
        if (memberId !== String(userId)) {
          recipientIds.add(memberId);
        }
      });
    }
    if (card.createdBy && String(card.createdBy) !== String(userId)) {
      recipientIds.add(String(card.createdBy));
    }

    // Send notifications
    for (const recipientId of recipientIds) {
      await createNotification({
        recipient: recipientId,
        sender: String(userId),
        type: 'card_deleted',
        message: card.title,
        relatedBoard: String(card.boardId),
      });
    }

    await Card.findByIdAndDelete(cardId);
    
    // Emit real-time event
    emitToBoardRoom(String(card.boardId), 'card-deleted', { 
      cardId,
      listId: card.listId,
      deletedBy: { id: userId, email: req.user?.email }
    });
    
    return res.status(200).json({ message: 'Xóa thẻ thành công' });
  } catch (err) {
    console.error('deleteCard error', err);
    return next(err);
  }
};

export const addComment = async (req: Request<{ cardId: string }, never, { text: string }>, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const { text } = req.body;
    const userId = req.user?._id;

    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.isValidObjectId(cardId)) 
      return res.status(400).json({ message: 'Invalid card id' });

    // AUTHORIZATION CHECK: Verify user has access to board via card
    const accessCheck = await checkBoardAccessViaCard(cardId, String(userId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const author = mongoose.isValidObjectId(String(userId)) ? new mongoose.Types.ObjectId(String(userId)) : undefined;
    const comment = { author, text, createdAt: new Date() };

    const updated = await Card.findByIdAndUpdate(
      cardId,
      { $push: { comments: comment } },
      { new: true }
    )
      .populate('createdBy', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl')
      .populate('comments.author', 'displayName username avatarUrl');

    if (!updated) 
      return res.status(404).json({ message: 'Card not found' });

    // Emit real-time event for comment addition
    const { emitToBoardRoom } = await import('../socket.js');
    const boardId = accessCheck.board?._id || accessCheck.card?.boardId;
    if (boardId) {
      emitToBoardRoom(String(boardId), 'card-updated', {
        card: updated,
        action: 'comment-added',
        updatedBy: {
          id: userId,
          email: req.user?.email
        }
      });
    }

    return res.status(201).json({ card: updated, message: 'Đã thêm bình luận' });
  } catch (err) {
    console.error('addComment error', err);
    return next(err);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId, commentId } = req.params;
    const userIdRaw = req.user?._id;

    if (!userIdRaw) 
      return res.status(401).json({ message: 'Unauthorized' });

    const userId = String(userIdRaw);

    if (!cardId || !commentId || !mongoose.isValidObjectId(cardId) || !mongoose.isValidObjectId(commentId))
      return res.status(400).json({ message: 'Invalid id' });

    // AUTHORIZATION CHECK: Verify user has access to board via card
    const accessCheck = await checkBoardAccessViaCard(cardId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    const card = await Card.findById(cardId).populate('comments.author', 'displayName username avatarUrl');
    if (!card) 
      return res.status(404).json({ message: 'Card not found' });

    const comments = card.comments || [];
    const comment = comments.find((c) => String(c._id) === String(commentId));
    if (!comment) 
      return res.status(404).json({ message: 'Comment not found' });

    const authorId = comment.author && typeof comment.author === 'object' && ('_id' in comment.author)
      ? String(comment.author._id)
      : String(comment.author);
    const cardCreatorId = card.createdBy ? String(card.createdBy._id || card.createdBy) : null;
    if (authorId !== userId && cardCreatorId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await Card.findByIdAndUpdate(cardId, { $pull: { comments: { _id: commentId } } }, { new: true })
      .populate('createdBy', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl')
      .populate('comments.author', 'displayName username avatarUrl');

    // Emit real-time event for comment deletion
    const { emitToBoardRoom } = await import('../socket.js');
    const boardId = accessCheck.board?._id || accessCheck.card?.boardId;
    if (boardId) {
      emitToBoardRoom(String(boardId), 'card-updated', {
        card: updated,
        action: 'comment-deleted',
        updatedBy: {
          id: userId,
          email: req.user?.email
        }
      });
    }

    return res.status(200).json({ card: updated, message: 'Đã xóa bình luận' });
  } catch (err) {
    console.error('deleteComment error', err);
    return next(err);
  }
};

export default { getCards, getCard, createCard, updateCard, deleteCard, addComment, deleteComment };
