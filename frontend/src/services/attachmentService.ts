import axios from '@/lib/axios';

export interface Attachment {
  _id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy?: {
    _id: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  };
  fileUrl: string;
  createdAt?: string;
}

const attachmentService = {
  // Upload attachment to a card
  // API route: /boards/:boardId/lists/:listId/cards/:cardId/attachments
  uploadAttachment: async (
    cardId: string,
    file: File,
    boardId?: string,
    listId?: string
  ): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    // You can pass boardId and listId, or construct from context
    // If not passed, we'll need to get them from the card data
    const response = await axios.post(
      `/boards/${boardId || ''}/lists/${listId || ''}/cards/${cardId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Upload response:', response.data);
    console.log('Attachment object:', response.data.attachment);
    
    return response.data.attachment;
  },

  getAttachments: async (
    cardId: string,
    boardId?: string,
    listId?: string
  ): Promise<Attachment[]> => {
    const response = await axios.get(
      `/boards/${boardId || ''}/lists/${listId || ''}/cards/${cardId}/attachments`
    );
    console.log('GetAttachments response:', response.data);
    console.log('Attachments:', response.data.attachments);
    return response.data.attachments;
  },

  // Delete an attachment
  deleteAttachment: async (
    cardId: string,
    attachmentId: string,
    boardId?: string,
    listId?: string
  ): Promise<void> => {
    await axios.delete(
      `/boards/${boardId || ''}/lists/${listId || ''}/cards/${cardId}/attachments/${attachmentId}`
    );
  },

  // Download attachment
  downloadAttachment: async (fileUrl: string, fileName: string): Promise<void> => {
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  // Get file icon based on MIME type
  getFileIcon: (fileType: string | undefined): string => {
    if (!fileType) return '📎';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎬';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word') || fileType.includes('document'))
      return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel'))
      return '📊';
    if (fileType.includes('zip') || fileType.includes('rar'))
      return '📦';
    return '📎';
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default attachmentService;
