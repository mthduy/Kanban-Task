import api from '../lib/axios';

export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    displayName?: string;
    username: string;
    avatarUrl?: string;
  };
  type:
    | 'workspace_invite'
    | 'workspace_remove'
    | 'workspace_deleted'
    | 'board_invitation'
    | 'board_member_added'
    | 'board_member_removed'
    | 'board_member_left'
    | 'board_deleted'
    | 'card_assigned'
    | 'card_moved'
    | 'card_deleted'
    | 'card_comment'
    | 'board_shared'
    | 'list_created'
    | 'list_updated'
    | 'list_deleted'
    | 'card_renamed'
    | 'card_due_reminder';
  message: string;
  relatedWorkspace?: {
    _id: string;
    name: string;
  };
  relatedBoard?: {
    _id: string;
    title: string;
  };
  relatedCard?: {
    _id: string;
    title: string;
  };
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationService = {
  getNotifications: async (unreadOnly = false) => {
    const params = unreadOnly ? { unreadOnly: 'true' } : {};
    const response = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications', { params });
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};
