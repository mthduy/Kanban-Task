import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Workspace } from '../models/Workspace.js';
import { Board } from '../models/Board.js';
import { List } from '../models/List.js';
import { Card } from '../models/Card.js';
import User from '../models/User.js';
import type { IWorkspace } from '../models/Workspace.js';
import type { IUser } from '../models/User.js';
import { createNotification } from './notificationController.js';

export const createWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, members } = req.body;
    const owner = req.user as (IUser & { _id?: string | mongoose.Types.ObjectId }) | undefined;

    const ownerId = owner?._id;
    if (!ownerId) 
      return res.status(401).json({ message: 'Unauthorized' });

    const membersList: string[] = Array.isArray(members) ? members.map(String) : [];
    const ownerIdStr = String(ownerId);
    if (!membersList.map(String).includes(ownerIdStr)) membersList.push(ownerIdStr);
    const doc = await Workspace.create({
      name,
      owner: new mongoose.Types.ObjectId(ownerIdStr),
      members: membersList.map((s) => new mongoose.Types.ObjectId(s)),
    });
    return res.status(201).json({ workspace: doc });
  } catch (error) {
    console.error('createWorkspace error', error);
    return next(error);
  }
};

export const listWorkspaces = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as IUser | undefined;
    const userId = user?._id;
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });   
    const boards = await Board.find({ $or: [{ owner: userId }, { members: userId }], workspace: { $exists: true, $ne: null } }).select('workspace').lean();
    const workspaceIdStrings = Array.from(new Set((boards as Array<{ workspace?: string | mongoose.Types.ObjectId }>)
      .map((b) => String(b.workspace)).filter(Boolean)));
    const workspaceObjectIds = workspaceIdStrings.map((s) => new mongoose.Types.ObjectId(s));

    const workspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { members: userId },
        { _id: { $in: workspaceObjectIds } },
      ],
    })
    .populate('members', '_id username email displayName avatarUrl')
    .sort({ updatedAt: -1 });

    return res.status(200).json({ workspaces });
  } catch (error) {
    console.error('listWorkspaces error', error);
    return next(error);
  }
};

export const getWorkspaceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user as IUser | undefined;
    const userId = user?._id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid workspace id' });
    }


    const workspace = await Workspace.findById(id)
      .populate('members', '_id username email displayName avatarUrl');
    if (!workspace)
       return res.status(404).json({ message: 'Workspace not found' });


    const isMemberOrOwner =
      workspace.owner?.toString() === String(userId) ||
      (workspace.members || []).map(String).includes(String(userId));
    if (!isMemberOrOwner)
       return res.status(403).json({ message: 'Forbidden' });


    const boards = await Board.find({ workspace: id }).sort({ updatedAt: 1 });

    return res.status(200).json({ workspace, boards });
  } catch (error) {
    console.error('getWorkspaceById error', error);
    return next(error);
  }
};

export const updateWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) 
      return res.status(400).json({ message: 'Invalid workspace id' });
    const user = req.user as IUser | undefined;
    const userId = user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const workspace = await Workspace.findById(id);
    if (!workspace)
      return res.status(404).json({ message: 'Workspace not found' });

    if (String(workspace.owner) !== String(userId))
      return res.status(403).json({ message: 'Only owner can update workspace' });

    const { name, members } = req.body;
    const updates: Partial<Pick<IWorkspace, 'name' | 'members'>> = {};
    
    // Track if name changed for notification
    let nameChanged = false;
    let oldName = workspace.name;
    
    if (typeof name === 'string' && name.trim().length >= 2) {
      const newName = name.trim();
      if (newName !== workspace.name) {
        nameChanged = true;
        updates.name = newName;
      }
    }
    
    if (Array.isArray(members)) {
      // Filter valid ObjectIds
      const candidateIds = members
        .map(String)
        .filter((s) => mongoose.isValidObjectId(s));
      
      const uniqueIds = Array.from(new Set(candidateIds));
      
      // SECURITY: Validate that all member IDs exist in database
      if (uniqueIds.length > 0) {
        const existing = await User.find({ _id: { $in: uniqueIds } }, { _id: 1 }).lean();
        const existingSet = new Set(existing.map((u) => String(u._id)));
        const missing = uniqueIds.filter((id) => !existingSet.has(id));
        
        if (missing.length > 0) {
          return res.status(400).json({ 
            message: 'Some member IDs do not exist', 
            fields: { members: missing } 
          });
        }
      }
      
      // Detect new members and removed members
      const oldMemberIds = (workspace.members || []).map(String);
      const newMemberIds = uniqueIds;
      
      const addedMembers = newMemberIds.filter(id => !oldMemberIds.includes(id));
      const removedMembers = oldMemberIds.filter(id => !newMemberIds.includes(id));
      
      // Notify ALL members when someone is added
      if (addedMembers.length > 0) {
        const addedMemberNames = await User.find({ _id: { $in: addedMembers } })
          .select('displayName username')
          .lean();
        const addedNames = addedMemberNames.map(u => u.displayName || u.username).join(', ');
        
        // Notify all members (old + new, except the one who made the change)
        const allMemberIds = [...new Set([...oldMemberIds, ...newMemberIds])];
        for (const memberId of allMemberIds) {
          if (memberId !== String(userId)) {
            await createNotification({
              recipient: memberId,
              sender: String(userId),
              type: 'workspace_invite',
              message: addedNames,
              relatedWorkspace: String(workspace._id),
            });
          }
        }
      }
      
      // Notify ALL remaining members when someone is removed
      if (removedMembers.length > 0) {
        const removedMemberNames = await User.find({ _id: { $in: removedMembers } })
          .select('displayName username')
          .lean();
        const removedNames = removedMemberNames.map(u => u.displayName || u.username).join(', ');
        
        // Notify all remaining members (except the one who made the change)
        for (const memberId of newMemberIds) {
          if (memberId !== String(userId)) {
            await createNotification({
              recipient: memberId,
              sender: String(userId),
              type: 'workspace_remove',
              message: removedNames,
              relatedWorkspace: String(workspace._id),
            });
          }
        }
        
        // Also notify the removed members themselves
        for (const memberId of removedMembers) {
          const removedMember = removedMemberNames.find(u => String(u._id) === memberId);
          const removedName = removedMember ? (removedMember.displayName || removedMember.username) : 'A member';
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'workspace_remove',
            message: removedName,
            relatedWorkspace: String(workspace._id),
          });
        }
      }
      
      updates.members = uniqueIds.map((s) => new mongoose.Types.ObjectId(s));
    }
    
    const updated = await Workspace.findByIdAndUpdate(id, { $set: updates }, { new: true });
    
    // Notify all members if name changed
    if (nameChanged && updated) {
      const allMemberIds = (updated.members || []).map(String);
      for (const memberId of allMemberIds) {
        if (memberId !== String(userId)) {
          await createNotification({
            recipient: memberId,
            sender: String(userId),
            type: 'workspace_invite',
            message: updated.name,
            relatedWorkspace: String(updated._id),
          });
        }
      }
    }
    
    return res.status(200).json({ workspace: updated });
  } catch (error) {
    console.error('updateWorkspace error', error);
    return next(error);
  }
};

export const deleteWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { confirmName } = req.body;

    if (!mongoose.isValidObjectId(id)) 
      return res.status(400).json({ message: 'Invalid workspace id' });
    
    const user = req.user as IUser | undefined;
    const userId = user?._id;
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    const workspace = await Workspace.findById(id);
    if (!workspace) 
      return res.status(404).json({ message: 'Workspace not found' });

    if (String(workspace.owner) !== String(userId)) 
      return res.status(403).json({ message: 'Only owner can delete workspace' });

    // Validation: Require workspace name confirmation
    if (!confirmName || typeof confirmName !== 'string') {
      return res.status(400).json({ 
        message: 'Please enter the workspace name to confirm deletion',
        field: 'confirmName'
      });
    }

    if (confirmName.trim() !== workspace.name.trim()) {
      return res.status(400).json({ 
        message: 'Workspace name does not match. Please enter the exact name to confirm.',
        field: 'confirmName'
      });
    }

    // Notify all members before deleting
    const memberIds = (workspace.members || []).map(String);
    for (const memberId of memberIds) {
      if (memberId !== String(userId)) {
        await createNotification({
          recipient: memberId,
          sender: String(userId),
          type: 'workspace_deleted',
          message: workspace.name,
          relatedWorkspace: String(workspace._id),
        });
      }
    }

    // CASCADE DELETE: Delete all related data
    // 1. Find all boards in this workspace
    const boards = await Board.find({ workspace: id }).select('_id').lean();
    const boardIds = boards.map(b => b._id);

    // 2. Delete all related data in parallel for performance
    await Promise.all([
      // Delete all cards in these boards
      Card.deleteMany({ boardId: { $in: boardIds } }),
      // Delete all lists in these boards
      List.deleteMany({ boardId: { $in: boardIds } }),
      // Delete all boards in this workspace
      Board.deleteMany({ workspace: id }),
      // Delete the workspace itself
      Workspace.findByIdAndDelete(id)
    ]);

    return res.status(200).json({ 
      message: 'Workspace and all related boards deleted successfully',
      deletedBoards: boardIds.length 
    });
  } catch (error) {
    console.error('deleteWorkspace error', error);
    return next(error);
  }
};

export const leaveWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) 
      return res.status(400).json({ message: 'Invalid workspace id' });
    const user = req.user as IUser | undefined;
    const userId = user?._id;
    if (!userId) 
      return res.status(401).json({ message: 'Unauthorized' });

    const workspace = await Workspace.findById(id);
    if (!workspace) 
      return res.status(404).json({ message: 'Workspace not found' });

    // Check if user is owner (owner cannot leave, must delete)
    if (String(workspace.owner) === String(userId)) 
      return res.status(403).json({ message: 'Owner cannot leave workspace. Delete it instead.' });

    // Check if user is member
    const isMember = (workspace.members || []).some(m => String(m) === String(userId));
    if (!isMember) 
      return res.status(404).json({ message: 'You are not a member of this workspace' });

    // Remove user from members
    await Workspace.findByIdAndUpdate(id, { 
      $pull: { members: userId } 
    });

    // Notify the workspace owner
    const leavingUser = await User.findById(userId).select('displayName username').lean();
    const leavingName = leavingUser ? (leavingUser.displayName || leavingUser.username) : 'A member';
    await createNotification({
      recipient: String(workspace.owner),
      sender: String(userId),
      type: 'workspace_remove',
      message: leavingName,
      relatedWorkspace: String(workspace._id),
    });

    return res.status(200).json({ message: 'Left workspace successfully' });
  } catch (error) {
    console.error('leaveWorkspace error', error);
    return next(error);
  }
};

export default {
  createWorkspace,
  listWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
};
