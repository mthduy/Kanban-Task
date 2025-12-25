import express from 'express';
import validateBody from '../validations/validateBody.js';
import { createBoardSchema, updateBoardSchema } from '../validations/board.validation.js';
import { createBoard, listBoards, getBoard, updateBoard, deleteBoard, removeMember, leaveBoard } from '../controllers/boardController.js';
import { inviteMemberToBoard } from '../controllers/invitationController.js';
import { requireBoardPermission } from '../middlewares/boardPermissionMiddleware.js';
import { BoardRole } from '../types/boardRoles.js';
import listRoutes from './listRoute.js';
import cardController from '../controllers/cardController.js';

const router = express.Router();

// Board CRUD
router.post('/', validateBody(createBoardSchema), createBoard);
router.get('/', listBoards);
router.get('/:boardId', getBoard); // No permission check - access check happens inside controller
router.get('/:boardId/cards', cardController.getCards); // filtered cards at board scope - access check inside
router.put('/:boardId', requireBoardPermission(BoardRole.OWNER), validateBody(updateBoardSchema), updateBoard);
router.delete('/:boardId', requireBoardPermission(BoardRole.OWNER), deleteBoard);

// Board invitation
router.post('/:boardId/invite', requireBoardPermission(BoardRole.OWNER), inviteMemberToBoard);

// Member management
router.post('/:boardId/leave', requireBoardPermission(BoardRole.EDITOR), leaveBoard); // Member tự rời board
router.delete('/:boardId/members/:memberId', requireBoardPermission(BoardRole.OWNER), removeMember); // Owner xóa member

// Mount listRoutes with mergeParams: true
router.use('/:boardId/lists', listRoutes);

export default router;
