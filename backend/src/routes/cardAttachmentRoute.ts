import express from 'express';
import multer from 'multer';
import type { Request } from 'express';
import {
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
  getAttachments,
} from '../controllers/cardAttachmentController.js';

const router = express.Router({ mergeParams: true });

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file, cb) => {
    // Allow all file types, but you can add restrictions here if needed
    // Example: block executable files
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.com'];
    const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    
    if (blockedExtensions.includes(fileExt)) {
      return cb(new Error('File type not allowed'));
    }
    
    cb(null, true);
  },
});

// Routes
router.post('/:cardId/attachments', upload.single('file'), uploadAttachment);
router.delete('/:cardId/attachments/:attachmentId', deleteAttachment);
router.get('/:cardId/attachments', getAttachments);

// Public route for downloading attachments (no auth required for download, but can be added)
router.get('/download/:fileName', downloadAttachment);

export { uploadAttachment, deleteAttachment, downloadAttachment, getAttachments };
export default router;

