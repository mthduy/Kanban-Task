import api from '@/lib/axios';
import type { Board, ListItem, CardItem } from '@/types/board';

export const boardService = {
  list: async (workspace?: string, q?: string): Promise<Board[]> => {
    const params: string[] = [];
    if (workspace) params.push(`workspace=${encodeURIComponent(workspace)}`);
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    const url = params.length ? `/boards?${params.join('&')}` : '/boards';
    console.debug('boardService.list url ->', url);
    const debugId = `dbg-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const res = await api.get(url, { withCredentials: true, headers: { 'x-debug-id': debugId } });
    console.debug('boardService.list', { url, debugId, data: res.data });
    // server responds { boards: Board[] }
    return res.data.boards as Board[];
  },

  create: async (payload: { title: string; description?: string; members?: string[]; workspace?: string }): Promise<Board> => {
    const res = await api.post('/boards', payload, { withCredentials: true });
    return res.data.board as Board;
  },

  get: async (id: string): Promise<{ board: Board; lists: ListItem[]; cards: CardItem[]; userRole?: 'owner' | 'editor' | 'viewer' }> => {
    const res = await api.get(`/boards/${id}`, { withCredentials: false });
    return res.data as { board: Board; lists: ListItem[]; cards: CardItem[]; userRole?: 'owner' | 'editor' | 'viewer' };
  },

  update: async (id: string, payload: { title?: string; description?: string; members?: string[]; background?: string }): Promise<Board> => {
    const res = await api.put(`/boards/${id}`, payload, { withCredentials: true });
    return res.data.board as Board;
  },

  updateBackground: async (id: string, background: string): Promise<Board> => {
    const res = await api.put(`/boards/${id}`, { background }, { withCredentials: true });
    return res.data.board as Board;
  },

  remove: async (id: string): Promise<boolean> => {
    const res = await api.delete(`/boards/${id}`, { withCredentials: true });
    // server sends 204 on success
    return res.status === 204 || res.status === 200;
  },

  inviteMember: async (boardId: string, email: string): Promise<{ message: string; invitationId?: string; invitedEmail?: string }> => {
    const res = await api.post(`/boards/${boardId}/invite`, { email }, { withCredentials: true });
    return res.data as { message: string; invitationId?: string; invitedEmail?: string };
  },

  removeMember: async (boardId: string, memberId: string): Promise<{ message: string; board?: { _id: string; title?: string; members?: unknown[] } }> => {
    const res = await api.delete(`/boards/${boardId}/members/${memberId}`, { withCredentials: true });
    return res.data as { message: string; board?: { _id: string; title?: string; members?: unknown[] } };
  },
};

export default boardService;
