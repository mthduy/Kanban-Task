import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Card } from '../models/Card.js';
import { checkBoardAccessViaCard } from '../utils/checkBoardAccess.js';
import {
  saveFile,
  deleteFile,
  readFile,
  generateFileName,
  getFileSize,
  getMimeType,
  getFileUrl,
} from '../utils/attachmentStorage.js';

// Upload attachment to card
export const uploadAttachment = async (
  req: Request<{ cardId: string }, never, never>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cardId } = req.params;
    const authUserId = req.user?._id;
    const file = req.file;

    // Validate inputs
    if (!authUserId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.isValidObjectId(cardId)) {
      return res.status(400).json({ message: 'Invalid card id' });
    }
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }

    // Authorization check - user must have access to the board
    const accessCheck = await checkBoardAccessViaCard(cardId, String(authUserId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    // Find card
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Generate unique filename and save file
    const fileName = generateFileName(file.originalname);
    saveFile(file.buffer, fileName);

    // Create attachment object - store the actual filename in fileUrl for later retrieval
    const attachment = {
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      uploadedBy: authUserId,
      fileUrl: fileName, // Store the actual filename here
      createdAt: new Date(),
    };

    // Initialize attachments array if not exists
    if (!card.attachments) {
      card.attachments = [];
    }

    // Add attachment to card
    card.attachments.push(attachment as any);
    const savedCard = await card.save();

    // Populate uploadedBy for response
    const populatedCard = await Card.findById(savedCard._id).populate('attachments.uploadedBy', 'displayName username avatarUrl');

    // Get the last attachment after populate
    const lastAttachment = populatedCard?.attachments?.[populatedCard.attachments.length - 1];

    // Format response with proper fileUrl
    const responseAttachment = lastAttachment ? {
      _id: (lastAttachment as any)._id,
      fileName: lastAttachment.fileName,
      fileSize: lastAttachment.fileSize,
      fileType: lastAttachment.fileType,
      uploadedBy: (lastAttachment as any).uploadedBy,
      fileUrl: getFileUrl((lastAttachment.fileUrl || '') as string),
      createdAt: lastAttachment.createdAt,
    } : null;

    if (!responseAttachment) {
      return res.status(500).json({ message: 'Failed to save attachment' });
    }

    return res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: responseAttachment,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    next(error);
  }
};

// Delete attachment from card
export const deleteAttachment = async (
  req: Request<{ cardId: string; attachmentId: string }, never, never>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cardId, attachmentId } = req.params;
    const authUserId = req.user?._id;

    // Validate inputs
    if (!authUserId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.isValidObjectId(cardId)) {
      return res.status(400).json({ message: 'Invalid card id' });
    }
    if (!mongoose.isValidObjectId(attachmentId)) {
      return res.status(400).json({ message: 'Invalid attachment id' });
    }

    // Authorization check
    const accessCheck = await checkBoardAccessViaCard(cardId, String(authUserId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    // Find card
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Find and remove attachment
    if (!card.attachments) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const attachmentIndex = card.attachments.findIndex(
      (att) => String(att._id) === String(attachmentId)
    );
    if (attachmentIndex === -1) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const attachment = card.attachments?.[attachmentIndex];
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Delete the file from storage (fileUrl contains the actual filename)
    const fileName = attachment.fileUrl as string;
    if (fileName) {
      deleteFile(fileName);
    }

    // Remove attachment from array
    card.attachments.splice(attachmentIndex, 1);
    await card.save();

    return res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    next(error);
  }
};

// Download attachment
export const downloadAttachment = async (
  req: Request<{ fileName: string }, never, never>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName } = req.params;

    // Validate filename (prevent directory traversal)
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    // Read file
    const fileBuffer = readFile(fileName);
    const mimeType = getMimeType(fileName);

    // Set response headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Send file
    return res.status(200).send(fileBuffer);
  } catch (error: any) {
    if (error.message === 'File not found') {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('Error downloading attachment:', error);
    next(error);
  }
};

// Get card attachments
export const getAttachments = async (
  req: Request<{ cardId: string }, never, never>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cardId } = req.params;
    const authUserId = req.user?._id;

    // Validate inputs
    if (!authUserId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.isValidObjectId(cardId)) {
      return res.status(400).json({ message: 'Invalid card id' });
    }

    // Authorization check
    const accessCheck = await checkBoardAccessViaCard(cardId, String(authUserId));
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.reason || 'Forbidden' });
    }

    // Find card and populate attachments
    const card = await Card.findById(cardId).populate('attachments.uploadedBy', 'displayName username avatarUrl');
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Format attachments with proper file URLs
    const formattedAttachments = (card.attachments || []).map((att) => {
      const attObj = (att as any);
      return {
        _id: attObj._id,
        fileName: attObj.fileName,
        fileSize: attObj.fileSize,
        fileType: attObj.fileType,
        uploadedBy: attObj.uploadedBy,
        fileUrl: getFileUrl(attObj.fileUrl as string),
        createdAt: attObj.createdAt,
      };
    });

    return res.status(200).json({
      attachments: formattedAttachments,
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    next(error);
  }
};
