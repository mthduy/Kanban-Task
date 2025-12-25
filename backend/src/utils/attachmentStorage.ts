import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads/attachments');

// Ensure upload directory exists
export const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

// Generate unique filename
export const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  return `${name}-${timestamp}-${random}${ext}`;
};

// Save file to disk
export const saveFile = (buffer: Buffer, fileName: string): string => {
  ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

// Delete file from disk
export const deleteFile = (fileName: string): void => {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Get file path
export const getFilePath = (fileName: string): string => {
  return path.join(UPLOAD_DIR, fileName);
};

// Get relative file URL for API access
export const getFileUrl = (fileName: string): string => {
  return `/attachments/download/${fileName}`;
};

// Read file for download
export const readFile = (fileName: string): Buffer => {
  const filePath = getFilePath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }
  return fs.readFileSync(filePath);
};

// Get file size
export const getFileSize = (buffer: Buffer): number => {
  return buffer.length;
};

// Get MIME type from file extension
export const getMimeType = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};
