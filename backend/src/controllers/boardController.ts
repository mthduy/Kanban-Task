import type { Request, Response, NextFunction } from 'express';
import mongoose, { type FilterQuery } from 'mongoose';
import type { IBoard } from '../models/Board.js';
import { Board } from '../models/Board.js';
import { List } from '../models/List.js';
import { Workspace } from '../models/Workspace.js';
import { Card } from '../models/Card.js';
import type { UpdateBoardBody, CreateBoardInput, WorkspaceLeanDocument } from '../types/boardTypes.js';
import { parseWorkspaceId } from '../utils/parseWorkspaceId.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { emitToBoardRoom } from '../socket.js';


export const createBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, members = [], workspace } = req.body;
    const ownerId = req.user?._id;
    if (!ownerId)
      return res.status(401).json({ message: "Unauthorized" });

    const workspaceId = parseWorkspaceId(workspace);
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId))
      return res.status(400).json({ message: "workspace is required and must be a valid workspace id" });

    const workspaceDoc = await Workspace.findById(workspaceId).lean<WorkspaceLeanDocument>();
    if (!workspaceDoc)
      return res.status(404).json({ message: "Workspace not found" });
    const ownerStr = String(ownerId);

    const isWorkspaceOwner = workspaceDoc.owner.toString() === ownerStr;
    const isWorkspaceMember = workspaceDoc.members?.some((m) => String(m) === ownerStr);
    if (!isWorkspaceOwner && !isWorkspaceMember) {
      return res.status(403).json({ message: "You are not a member of this workspace" });
    }

    const memberIds = Array.isArray(members)
      ? members.map((id: string) => String(id).trim())
      : [];

    const workspaceMemberIds = new Set<string>([
      String(workspaceDoc.owner),
      ...(workspaceDoc.members || []).map((m) => String(m)),
    ]);

    const uniqueIds = [...new Set(memberIds)];
    const existingUsers = await User.find(
      { _id: { $in: uniqueIds } },
      { _id: 1 }
    ).lean();
    const existingSet = new Set(existingUsers.map((u) => String(u._id)));
    const nonexistent = uniqueIds.filter((id) => !existingSet.has(id));
    if (nonexistent.length > 0) {
      return res.status(400).json({
        message: "Some member IDs do not exist",
        fields: { members: nonexistent },
      });
    }
   
    const notInWorkspace = uniqueIds.filter((id) => !workspaceMemberIds.has(id));
    if (notInWorkspace.length > 0) {
      return res.status(403).json({
        message: "Cannot add members who are not in the workspace",
        fields: { members: notInWorkspace },
      });
    }

    const payload: CreateBoardInput = {
      title: title || "",
      description: typeof description === "string" ? description : undefined,
      owner: new mongoose.Types.ObjectId(ownerId),
      members: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
      workspace: new mongoose.Types.ObjectId(workspaceId),
    };
    const board = await Board.create(payload);
    
    // Emit real-time event
    emitToBoardRoom(String(board._id), 'board-created', { 
      board,
      createdBy: { id: ownerId, email: req.user?.email }
    });
    
    return res.status(201).json({ board });
  } catch (error) {
    console.error("createBoard error", error);
    return next(error);
  }
};


export const listBoards = async (
  req: Request<{}, {}, {}, { workspace?: string; q?: string; page?: string; limit?: string; sort?: string }>, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });
    
    const { workspace, q, page = '1', limit = '50', sort = 'createdAt' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const userWorkspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    }).select('_id').lean();
    
    const userWorkspaceIds = userWorkspaces.map(ws => ws._id);

    const filters: FilterQuery<IBoard> = { 
      $and: [ 
        { 
          $or: [
            { owner: userId }, 
            { members: userId },
            { workspace: { $in: userWorkspaceIds } }
          ] 
        } 
      ] 
    } as FilterQuery<IBoard>;

    if (workspace && typeof workspace === 'string' && mongoose.isValidObjectId(workspace)) {
      (filters.$and as any).push({ workspace: new mongoose.Types.ObjectId(workspace) });
    }

    if (q && typeof q === 'string' && q.trim()) {
      if (q.length > 100) {
        return res.status(400).json({ message: 'Query too long (max 100 chars)' });
      }
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      (filters.$and as any).push({ $or: [{ title: regex }, { description: regex }] });
    }

    // Sort options
    const sortOptions: Record<string, 1 | -1> = {};
    if (sort === 'createdAt' || sort === '-createdAt') {
      sortOptions.createdAt = sort === '-createdAt' ? -1 : 1;
    } else if (sort === 'title' || sort === '-title') {
      sortOptions.title = sort === '-title' ? -1 : 1;
    } else if (sort === 'updatedAt' || sort === '-updatedAt') {
      sortOptions.updatedAt = sort === '-updatedAt' ? -1 : 1;
    } else {
      sortOptions.createdAt = 1;
    }

    const total = await Board.countDocuments(filters);
    
    const boards = await Board.find(filters)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('workspace', 'name')
      .populate('owner', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl');
    
    return res.status(200).json({ 
      boards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('listBoards error', error);
    return next(error);
  }
};

export const getBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    const userId = req.user?._id?.toString();
    
    if (!boardId || !mongoose.isValidObjectId(boardId))
       return res.status(400).json({ message: 'Invalid id' });
    
    if (!userId)
       return res.status(401).json({ message: 'Unauthorized' });

    // Check access and get role using centralized utility
    const { checkBoardAccess } = await import('../utils/checkBoardAccess.js');
    const accessCheck = await checkBoardAccess(boardId, userId);
    
    if (!accessCheck.hasAccess || !accessCheck.board || accessCheck.role === null) {
      return res.status(403).json({ 
        message: accessCheck.reason || 'Bạn không có quyền truy cập bảng này' 
      });
    }

    const board = await Board.findById(boardId)
      .populate('owner', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl')
      .populate('workspace');
    
    if (!board) 
      return res.status(404).json({ message: 'Board not found' });

    // Sort lists and cards by createdAt asc (oldest first)
    const lists = await List.find({ boardId: boardId }).sort({ createdAt: 1 });
    const cards = await Card.find({ boardId: boardId })
      .sort({ createdAt: 1 })
      .populate('createdBy', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl');
      
    await Card.populate(cards, { path: 'comments.author', select: 'displayName username avatarUrl' });
    await Card.populate(cards, { path: 'activities.user', select: 'displayName username avatarUrl' });

    // Return role information for frontend to use
    return res.status(200).json({ 
      board, 
      lists, 
      cards,
      userRole: accessCheck.role // 'owner' | 'editor' | 'viewer'
    });
  } catch (error) {
    console.error('getBoard error', error);
    return next(error);
  }
};

export const updateBoard = async (req: Request & { body: UpdateBoardBody }, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.isValidObjectId(boardId)) 
      return res.status(400).json({ message: 'Invalid id' });

    const board = await Board.findById(boardId).populate('workspace');
    if (!board) 
      return res.status(404).json({ message: 'Board not found' });

    // Check if trying to change workspace (compare IDs properly)
    if (req.body.workspace) {
      const currentWorkspaceId = typeof board.workspace === 'object' && board.workspace?._id 
        ? String(board.workspace._id) 
        : String(board.workspace);
      const newWorkspaceId = String(req.body.workspace);
      
      if (currentWorkspaceId !== newWorkspaceId) {
        return res.status(400).json({ message: "Cannot change workspace of a board" });
      }
    }

    const userId = req.user?._id?.toString();
  
  // Only owner can update board
  if (board.owner?.toString() !== userId) {
    return res.status(403).json({ message: 'Only owner can update board' });
  }
  const allowed: Partial<Pick<IBoard, 'title' | 'description' | 'members' | 'background'>> = {};
    const { title, description, members, background } = req.body;
    
    // Track if title changed for notification
    let titleChanged = false;
    let oldTitle = board.title;
    
    if (typeof title === 'string') {
      if (title !== board.title) {
        titleChanged = true;
      }
      allowed.title = title; // already trimmed by Zod schema
    }
    if (typeof description === 'string') allowed.description = description; // already trimmed by Zod
    if (typeof background === 'string') allowed.background = background; // already trimmed by Zod

    // accept members as array, JSON-string, or CSV string — normalize via helper and validate
    if (members !== undefined) {
      // members were validated by Zod as ObjectId strings; normalize and ensure existence
      const uniqueIds = Array.from(new Set((members as string[]).map((s) => String(s).trim())));
      if (uniqueIds.length) {
        const existing = await User.find({ _id: { $in: uniqueIds } }, { _id: 1 }).lean();
        const existingSet = new Set(existing.map((u) => String(u._id)));
        const missing = uniqueIds.filter((id) => !existingSet.has(id));
        if (missing.length) {
          return res.status(400).json({ message: 'Some member IDs do not exist', fields: { members: missing } });
        }

        // SECURITY: Validate that all members belong to the workspace
        const workspaceDoc = await Workspace.findById(board.workspace).lean<WorkspaceLeanDocument>();
        if (workspaceDoc) {
          const workspaceMemberIds = new Set<string>([
            String(workspaceDoc.owner),
            ...(workspaceDoc.members || []).map((m) => String(m)),
          ]);

          const notInWorkspace = uniqueIds.filter((id) => !workspaceMemberIds.has(id));
          if (notInWorkspace.length > 0) {
            return res.status(403).json({
              message: "Cannot add members who are not in the workspace",
              fields: { members: notInWorkspace },
            });
          }
        }
      }
      
      // Detect member changes and send notifications
      const oldMemberIds = (board.members || []).map(String);
      const newMemberIds = uniqueIds;
      
      const addedMembers = newMemberIds.filter(id => !oldMemberIds.includes(id));
      const removedMembers = oldMemberIds.filter(id => !newMemberIds.includes(id));
      
      // NOTE: Don't send notifications here to avoid duplicates
      // Notifications for joining are sent from acceptInvitation
      // This updateBoard is for manual member management by owner
      if (addedMembers.length > 0) {
        // Members added to board (no notification sent from updateBoard)
      }
      
      // Notify ALL remaining members AND removed members
      if (removedMembers.length > 0) {
        const removedMemberNames = await User.find({ _id: { $in: removedMembers } })
          .select('displayName username')
          .lean();
        const removedNames = removedMemberNames.map(u => u.displayName || u.username).join(', ');
        
        // Notify remaining members
          for (const memberId of newMemberIds) {
          if (memberId !== userId) {
            await createNotification({
              recipient: memberId,
              sender: String(userId),
              type: 'board_member_removed',
                message: removedNames,
              relatedBoard: String(board._id),
            });
          }
        }
        
        // Notify removed members themselves
        for (const memberId of removedMembers) {
          const removedMember = removedMemberNames.find(u => String(u._id) === memberId);
          const removedMemberName = removedMember ? (removedMember.displayName || removedMember.username) : 'A member';
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'board_member_removed',
            message: removedMemberName,
            relatedBoard: String(board._id),
          });
        }
      }
      
      allowed.members = uniqueIds.map((s) => new mongoose.Types.ObjectId(s));
    }

    const updated = await Board.findByIdAndUpdate(
      boardId, 
      { $set: allowed }, 
      { new: true });
    
    // Notify all members if title changed
    if (titleChanged && updated) {
      const allMemberIds = (updated.members || []).map(String);
          for (const memberId of allMemberIds) {
        if (memberId !== userId) {
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'board_member_added',
                message: updated.title,
            relatedBoard: String(updated._id),
          });
        }
      }
    }
    
    // Emit real-time event
    if (updated) {
      emitToBoardRoom(String(updated._id), 'board-updated', { 
        board: updated,
        action: 'update',
        updatedBy: { id: userId, email: req.user?.email }
      });
    }
    
    return res.status(200).json({ board: updated });
  } catch (error) {
    console.error('updateBoard error', error);
    return next(error);
  }
};

export const deleteBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.isValidObjectId(boardId)) 
      return res.status(400).json({ message: 'Invalid id' });

    const board = await Board.findById(boardId);
    if (!board)
      return res.status(404).json({ message: 'Board not found' });

    const userId = req.user?._id?.toString();
    
    if (board.owner?.toString() !== userId) {
      return res.status(403).json({ message: 'Only owner can delete board' });
    }

    // Notify all members before deleting
    const memberIds = (board.members || []).map(String);
      for (const memberId of memberIds) {
      if (memberId !== userId) {
        await createNotification({
          recipient: memberId,
          sender: String(userId),
          type: 'board_deleted',
          message: board.title,
          relatedBoard: String(board._id),
        });
      }
    }

    await Promise.all([
      List.deleteMany({ boardId: boardId }),
      Card.deleteMany({ boardId: boardId }),
      Board.findByIdAndDelete(boardId),
    ]);

    return res.status(204).send();
  } catch (error) {
    console.error('deleteBoard error', error);
    return next(error);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId, memberId } = req.params as { boardId?: string; memberId?: string };
    
    if (!boardId || !mongoose.isValidObjectId(boardId)) {
      return res.status(400).json({ message: 'Invalid board id' });
    }
    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ message: 'Invalid member id' });
    }

    const board = await Board.findById(boardId);
    if (!board) 
      return res.status(404).json({ message: 'Board not found' });

    const userId = req.user?._id?.toString();
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    const ownerId = board.owner?.toString();

    if (ownerId === memberId) {
      return res.status(400).json({ message: 'Cannot remove owner from board' });
    }
    
    // Allow member to remove themselves OR owner to remove any member
    const isSelfRemoval = userId === memberId;
    const isOwnerRemovingOther = userId === ownerId && userId !== memberId;
    
    if (!isSelfRemoval && !isOwnerRemovingOther) {
      return res.status(403).json({ message: 'Only owner can remove other members' });
    }

    const isMember = (board.members || []).some((m) => String(m) === memberId);
    if (!isMember) {
      return res.status(404).json({ message: 'Member not found on board' });
    }

    const memberObjId = new mongoose.Types.ObjectId(memberId);
    
    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      { $pull: { members: memberObjId } },
      { new: true }
    )
      .populate('owner', 'displayName username avatarUrl')
      .populate('members', 'displayName username avatarUrl');

    if (!updatedBoard) 
      return res.status(404).json({ message: 'Board not found' });


    await Card.updateMany(
      { boardId: boardId },
      { $pull: { members: memberObjId } }
    );


    await Card.updateMany(
      { boardId: boardId },
      { $pull: { comments: { author: memberObjId } } }
    );

    await Card.updateMany(
      { boardId: boardId },
      { $pull: { activities: { user: memberObjId } } }
    );

    // Send appropriate notification
    if (isSelfRemoval) {
      // Member left voluntarily - notify ALL remaining members
      const remainingMemberIds = (updatedBoard?.members || []).map(String);
      const leavingUser = await User.findById(userId).select('displayName username').lean();
      const leavingUserName = leavingUser?.displayName || leavingUser?.username || 'Một thành viên';
      
      for (const memberId of remainingMemberIds) {
        if (memberId !== userId) {
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'board_member_left',
            message: leavingUserName,
            relatedBoard: String(board._id),
          });
        }
      }
      
      // Also notify owner specifically
      if (ownerId && !remainingMemberIds.includes(ownerId)) {
        await createNotification({
          recipient: String(ownerId),
          sender: String(userId),
          type: 'board_member_left',
          message: leavingUserName,
          relatedBoard: String(board._id),
        });
      }
    } else {
      // Owner removed member - notify ALL remaining members AND the removed member
      const remainingMemberIds = (updatedBoard?.members || []).map(String);
      const removedUser = await User.findById(memberId).select('displayName username').lean();
      const removedUserName = removedUser?.displayName || removedUser?.username || 'Một thành viên';
      
      // Notify all remaining members
      for (const remainingMemberId of remainingMemberIds) {
        if (remainingMemberId !== userId) {
          try {
            await createNotification({
              recipient: remainingMemberId,
              sender: String(userId),
              type: 'board_member_removed',
              message: removedUserName,
              relatedBoard: String(board._id),
            });
          } catch (err) {
            console.error('Failed to notify remaining member:', remainingMemberId, err);
          }
        }
      }
      
      // Also notify owner if they're not in remaining members
      if (ownerId && ownerId !== userId && !remainingMemberIds.includes(ownerId)) {
        try {
          await createNotification({
            recipient: String(ownerId),
            sender: String(userId),
            type: 'board_member_removed',
            message: removedUserName,
            relatedBoard: String(board._id),
          });
        } catch (err) {
          console.error('Failed to notify owner:', ownerId, err);
        }
      }
      
      // Notify the removed member
        try {
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'board_member_removed',
            message: removedUserName,
            relatedBoard: String(board._id),
          });
        } catch (err) {
          console.error('Failed to notify removed member:', memberId, err);
        }
    }

    return res.status(200).json({ 
      message: 'Xóa thành viên và dọn dẹp dữ liệu thành công', 
      board: updatedBoard 
    });
  } catch (error) {
    console.error('removeMember error', error);
    return next(error);
  }
};

export const leaveBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    if (!boardId || !mongoose.isValidObjectId(boardId)) 
      return res.status(400).json({ message: 'Invalid board id' });

    const board = await Board.findById(boardId);
    if (!board) 
      return res.status(404).json({ message: 'Board not found' });

    const userId = req.user?._id?.toString();
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    const ownerId = board.owner?.toString();
    
    if (ownerId === userId) {
      return res.status(400).json({ message: 'Owner cannot leave board. Delete board or transfer ownership first' });
    }

    const isMember = (board.members || []).some((m) => String(m) === userId);
    if (!isMember) {
      return res.status(404).json({ message: 'You are not a member of this board' });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    
    await Board.findByIdAndUpdate(
      boardId,
      { $pull: { members: userObjId } }
    );

    await Card.updateMany(
      { boardId: boardId },
      { $pull: { members: userObjId } }
    );


    await Card.updateMany(
      { boardId: boardId },
      { $pull: { comments: { author: userObjId } } }
    );

    await Card.updateMany(
      { boardId: boardId },
      { $pull: { activities: { user: userObjId } } }
    );

    // Notify the board owner
    const leavingUser = await User.findById(userId).select('displayName username').lean();
    const leavingUserName = leavingUser?.displayName || leavingUser?.username || 'A member';
    await createNotification({
      recipient: String(ownerId),
      sender: String(userId),
      type: 'board_member_left',
      message: leavingUserName,
      relatedBoard: String(board._id),
    });

    return res.status(200).json({ message: 'Left board successfully' });
  } catch (error) {
    console.error('leaveBoard error', error);
    return next(error);
  }
};

export default {
  createBoard,
  listBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  removeMember,
  leaveBoard,
};
