import api from '@/lib/axios';
import type { CardItem } from '@/types/board';

export type CardFilterOptions = {
  members?: string[];
  statuses?: string[];
  completed?: boolean;
  search?: string;
  labelNames?: string[];
  labelColors?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
  sort?: `${string}:${'asc' | 'desc'}`;
};

export const cardService = {
  // Create a card under a specific board and list
  create: async (boardId: string, listId: string, title: string, position?: number, description?: string) => {
    const res = await api.post(`/boards/${boardId}/lists/${listId}/cards`, { title, position, description }, { withCredentials: true });
    return { card: res.data.card as CardItem, message: res.data.message };
  },

  // Update a card — include boardId and listId to match nested route
  update: async (
    boardId: string,
    listId: string,
    id: string,
    payload: { 
      title?: string; 
      description?: string; 
      position?: number; 
      listId?: string; 
      completed?: boolean; 
      members?: string[]; 
      labels?: Array<{ color: string; name: string; _id?: string }>; 
      dueDate?: string | null;
      activity?: { type: string; text: string; metadata?: unknown };
    }
  ) => {
    const res = await api.put(`/boards/${boardId}/lists/${listId}/cards/${id}`, payload, { withCredentials: true });
    return { card: res.data.card as CardItem, message: res.data.message };
  },

  // Remove a card
  remove: async (boardId: string, listId: string, id: string) => {
    const res = await api.delete(`/boards/${boardId}/lists/${listId}/cards/${id}`, { withCredentials: true });
    return { success: res.status === 200, message: res.data.message };
  },

  // Comments — include boardId + listId
  postComment: async (boardId: string, listId: string, cardId: string, text: string) => {
    const res = await api.post(`/boards/${boardId}/lists/${listId}/cards/${cardId}/comments`, { text }, { withCredentials: true });
    return { card: res.data.card as CardItem, message: res.data.message };
  },

  deleteComment: async (boardId: string, listId: string, cardId: string, commentId: string) => {
    const res = await api.delete(`/boards/${boardId}/lists/${listId}/cards/${cardId}/comments/${commentId}`, { withCredentials: true });
    return { card: res.data.card as CardItem, message: res.data.message };
  },

  // Server-side filter
  filter: async (boardId: string, opts: CardFilterOptions, listId?: string) => {
    const params: Record<string, string> = {};
    if (opts.members?.length) params.members = opts.members.join(',');
    if (opts.statuses?.length) params.statuses = opts.statuses.join(',');
    if (typeof opts.completed === 'boolean') params.completed = String(opts.completed);
    if (opts.search) params.search = opts.search.trim();
    if (opts.labelNames?.length) params.labelNames = opts.labelNames.join(',');
    if (opts.labelColors?.length) params.labelColors = opts.labelColors.join(',');
    if (opts.dueDateFrom) params.dueDateFrom = opts.dueDateFrom;
    if (opts.dueDateTo) params.dueDateTo = opts.dueDateTo;
    if (opts.createdFrom) params.createdFrom = opts.createdFrom;
    if (opts.createdTo) params.createdTo = opts.createdTo;
    if (opts.page) params.page = String(opts.page);
    if (opts.limit) params.limit = String(opts.limit);
    if (opts.sort) params.sort = opts.sort;
    const url = listId ? `/boards/${boardId}/lists/${listId}/cards` : `/boards/${boardId}/cards`;
    const res = await api.get(url, { params, withCredentials: true });
    return res.data as { cards: CardItem[]; page: number; limit: number; total: number; totalPages: number };
  },
};

export default cardService;
