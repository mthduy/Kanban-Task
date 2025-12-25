import mongoose from 'mongoose';
import { Board } from '../models/Board.js';
import { Workspace } from '../models/Workspace.js';
import { BoardRole } from '../types/boardRoles.js';

/**
 * Verify if a user has access to a board and determine their role
 * 
 * Role determination (in order of priority):
 * 1. Board owner → OWNER (full control)
 * 2. Board member → EDITOR (can modify content)
 * 3. Workspace owner → EDITOR (can modify content)
 * 4. Workspace member → VIEWER (read-only)
 * 5. None of the above → null (no access)
 */
export async function checkBoardAccess(
  boardId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId
): Promise<{
  hasAccess: boolean;
  board: any | null;
  role: BoardRole | null;
  reason?: string | undefined;
}> {
  try {
    // Validate inputs
    if (!boardId || !mongoose.isValidObjectId(String(boardId))) {
      return { hasAccess: false, board: null, role: null, reason: 'Invalid board id' };
    }

    if (!userId || !mongoose.isValidObjectId(String(userId))) {
      return { hasAccess: false, board: null, role: null, reason: 'Invalid user id' };
    }

    const userIdStr = String(userId);

    // Find board with workspace populated
    const board = await Board.findById(String(boardId))
      .populate('workspace')
      .lean();

    if (!board) {
      return { hasAccess: false, board: null, role: null, reason: 'Board not found' };
    }

    // Priority 1: Board owner → OWNER role (full control)
    const boardOwnerId = String(board.owner);
    if (boardOwnerId === userIdStr) {
      return { hasAccess: true, board, role: BoardRole.OWNER };
    }

    // Priority 2: Board member → EDITOR role (can modify content)
    const isBoardMember = (board.members || []).some((m: any) => String(m) === userIdStr);
    if (isBoardMember) {
      return { hasAccess: true, board, role: BoardRole.EDITOR };
    }

    // Priority 3 & 4: Workspace owner/member → check workspace relationship
    if (board.workspace && typeof board.workspace === 'object') {
      const workspace = board.workspace as any;
      const workspaceOwnerId = String(workspace.owner);
      
      // Workspace owner → EDITOR role (can manage workspace boards)
      if (workspaceOwnerId === userIdStr) {
        return { hasAccess: true, board, role: BoardRole.EDITOR };
      }

      // Workspace member (but NOT board member) → VIEWER role (read-only)
      const isWorkspaceMember = (workspace.members || []).some((m: any) => String(m) === userIdStr);
      if (isWorkspaceMember) {
        return { hasAccess: true, board, role: BoardRole.VIEWER };
      }
    }

    // No access at all
    return { 
      hasAccess: false, 
      board: null,
      role: null,
      reason: 'You do not have permission to access this board' 
    };

  } catch (error) {
    console.error('checkBoardAccess error:', error);
    return { 
      hasAccess: false, 
      board: null,
      role: null,
      reason: 'Error checking board access' 
    };
  }
}

/**
 * Verify board access via listId
 */
export async function checkBoardAccessViaList(
  listId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId
): Promise<{
  hasAccess: boolean;
  board: any | null;
  list: any | null;
  role: BoardRole | null;
  reason?: string | undefined;
}> {
  try {
    const { List } = await import('../models/List.js');
    
    if (!mongoose.isValidObjectId(String(listId))) {
      return { hasAccess: false, board: null, list: null, role: null, reason: 'Invalid list id' };
    }

    const list = await List.findById(String(listId)).lean();
    if (!list) {
      return { hasAccess: false, board: null, list: null, role: null, reason: 'List not found' };
    }

    const boardAccess = await checkBoardAccess(String(list.boardId), userId);
    
    return {
      hasAccess: boardAccess.hasAccess,
      board: boardAccess.board,
      list,
      role: boardAccess.role,
      reason: boardAccess.reason
    };
  } catch (error) {
    console.error('checkBoardAccessViaList error:', error);
    return { 
      hasAccess: false, 
      board: null, 
      list: null,
      role: null,
      reason: 'Error checking board access via list' 
    };
  }
}

/**
 * Verify board access via cardId
 */
export async function checkBoardAccessViaCard(
  cardId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId
): Promise<{
  hasAccess: boolean;
  board: any | null;
  card: any | null;
  role: BoardRole | null;
  reason?: string | undefined;
}> {
  try {
    const { Card } = await import('../models/Card.js');
    
    if (!mongoose.isValidObjectId(String(cardId))) {
      return { hasAccess: false, board: null, card: null, role: null, reason: 'Invalid card id' };
    }

    const card = await Card.findById(String(cardId)).lean();
    if (!card) {
      return { hasAccess: false, board: null, card: null, role: null, reason: 'Card not found' };
    }

    const boardAccess = await checkBoardAccess(String(card.boardId), userId);
    
    return {
      hasAccess: boardAccess.hasAccess,
      board: boardAccess.board,
      card,
      role: boardAccess.role,
      reason: boardAccess.reason
    };
  } catch (error) {
    console.error('checkBoardAccessViaCard error:', error);
    return { 
      hasAccess: false, 
      board: null, 
      card: null,
      role: null,
      reason: 'Error checking board access via card' 
    };
  }
}
