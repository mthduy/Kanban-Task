import type { Request, Response, NextFunction } from 'express';
import { BoardRole, hasPermission } from '../types/boardRoles.js';
import { 
  checkBoardAccess, 
  checkBoardAccessViaList, 
  checkBoardAccessViaCard 
} from '../utils/checkBoardAccess.js';

/**
 * Middleware to check board permission based on required role
 * 
 * Usage:
 * - requireBoardPermission('viewer') - Read-only access
 * - requireBoardPermission('editor') - Can modify content
 * - requireBoardPermission('owner') - Full control
 * 
 * This middleware expects one of these params:
 * - boardId (direct board access)
 * - listId (access via list)
 * - cardId (access via card)
 */
export function requireBoardPermission(requiredRole: BoardRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
      }

      const { boardId, listId, cardId } = req.params;
      let accessCheck;

      // Determine which access check to use
      if (cardId) {
        accessCheck = await checkBoardAccessViaCard(cardId, userId);
      } else if (listId) {
        accessCheck = await checkBoardAccessViaList(listId, userId);
      } else if (boardId) {
        accessCheck = await checkBoardAccess(boardId, userId);
      } else {
        return res.status(400).json({ 
          message: 'Thiếu tham số boardId, listId hoặc cardId' 
        });
      }

      // Check if user has access
      if (!accessCheck.hasAccess || !accessCheck.role) {
        return res.status(403).json({ 
          message: accessCheck.reason || 'Bạn không có quyền truy cập board này' 
        });
      }

      // Check if user has sufficient permission
      if (!hasPermission(accessCheck.role, requiredRole)) {
        const roleMessages = {
          [BoardRole.VIEWER]: 'Bạn chỉ có quyền xem board này',
          [BoardRole.EDITOR]: 'Bạn cần quyền chủ sở hữu để thực hiện thao tác này',
          [BoardRole.OWNER]: '', // Should never reach here
        };
        
        return res.status(403).json({ 
          message: roleMessages[accessCheck.role] || 'Bạn không đủ quyền thực hiện thao tác này',
          currentRole: accessCheck.role,
          requiredRole: requiredRole
        });
      }

      // Attach board info and role to request for controllers to use
      req.boardInfo = {
        board: accessCheck.board,
        role: accessCheck.role
      };

      next();
    } catch (error) {
      console.error('requireBoardPermission error:', error);
      return res.status(500).json({ message: 'Lỗi khi kiểm tra quyền truy cập' });
    }
  };
}
