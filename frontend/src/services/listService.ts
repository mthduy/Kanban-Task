import api from '@/lib/axios';
import type { ListItem } from '@/types/board';

export const listService = {
  listByBoard: async (boardId: string): Promise<ListItem[]> => {
    const res = await api.get(`/boards/${boardId}`, { withCredentials: true });
    // backend `GET /boards/:id` returns { board, lists, cards }
    return (res.data.lists || []) as ListItem[];
  },

  create: async (boardId: string, title: string) => {
    const res = await api.post(`/boards/${boardId}/lists`, { title }, { withCredentials: true });
    return { list: res.data.list as ListItem, message: res.data.message };
  },
  update: async (boardId: string, id: string, payload: { title?: string }) => {
    const res = await api.put(`/boards/${boardId}/lists/${id}`, payload, { withCredentials: true });
    return { list: res.data.list as ListItem, message: res.data.message };
  },

  remove: async (boardId: string, id: string) => {
    const res = await api.delete(`/boards/${boardId}/lists/${id}`, { withCredentials: true });
    return { success: res.status === 200, message: res.data.message };
  },
};

export default listService;
