import express from 'express';
import listController from '../controllers/listController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { requireBoardPermission } from '../middlewares/boardPermissionMiddleware.js';
import { BoardRole } from '../types/boardRoles.js';
import cardController from '../controllers/cardController.js';
import validateBody from '../validations/validateBody.js';
import { createListSchema, updateListSchema } from '../validations/list.validation.js';
import { uploadAttachment, deleteAttachment, getAttachments } from '../controllers/cardAttachmentController.js';
import multer from 'multer';
import type { Request } from 'express';

const router = express.Router({ mergeParams: true }); // ⚡ mergeParams để lấy boardId từ parent

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file, cb) => {
    // Block executable files
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.com'];
    const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    
    if (blockedExtensions.includes(fileExt)) {
      return cb(new Error('File type not allowed'));
    }
    
    cb(null, true);
  },
});

// List CRUD under Board
router.get('/', protectedRoute, listController.getListsByBoard); // GET /boards/:boardId/lists - access check inside
router.post('/', protectedRoute, requireBoardPermission(BoardRole.EDITOR), validateBody(createListSchema), listController.createList);
router.put('/:listId', protectedRoute, requireBoardPermission(BoardRole.EDITOR), validateBody(updateListSchema), listController.updateList);
router.delete('/:listId', protectedRoute, requireBoardPermission(BoardRole.EDITOR), listController.deleteList);

// Card CRUD under List
router.get('/:listId/cards', protectedRoute, cardController.getCards); // GET filtered cards - access check inside
router.post('/:listId/cards', protectedRoute, requireBoardPermission(BoardRole.EDITOR), cardController.createCard);
router.put('/:listId/cards/:cardId', protectedRoute, requireBoardPermission(BoardRole.EDITOR), cardController.updateCard);
router.delete('/:listId/cards/:cardId', protectedRoute, requireBoardPermission(BoardRole.EDITOR), cardController.deleteCard);

// Comments under Card
router.post('/:listId/cards/:cardId/comments', protectedRoute, requireBoardPermission(BoardRole.EDITOR), cardController.addComment);
router.delete('/:listId/cards/:cardId/comments/:commentId', protectedRoute, requireBoardPermission(BoardRole.EDITOR), cardController.deleteComment);

// Attachments under Card
router.post('/:listId/cards/:cardId/attachments', protectedRoute, requireBoardPermission(BoardRole.EDITOR), upload.single('file'), uploadAttachment);
router.delete('/:listId/cards/:cardId/attachments/:attachmentId', protectedRoute, requireBoardPermission(BoardRole.EDITOR), deleteAttachment);
router.get('/:listId/cards/:cardId/attachments', protectedRoute, getAttachments);

export default router;
