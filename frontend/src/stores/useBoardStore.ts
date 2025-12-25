import { create } from 'zustand';
import { boardService } from '@/services/boardService';
import { toast } from 'sonner';
import type { Board } from '@/types/board';

// ensure only the latest fetch updates the store (prevents older overlapping responses from clearing state)
let _latestBoardsFetchId = 0;

type BoardState = {
  boards: Board[];
  loading: boolean;
  fetchBoards: (workspace?: string, q?: string) => Promise<void>;
  addBoard: (payload: { title: string; description?: string; workspace?: string }) => Promise<import('@/types/board').Board | void>;
  updateBoard: (id: string, payload: { title?: string; description?: string }) => Promise<import('@/types/board').Board | void>;
  removeBoard: (id: string) => Promise<void>;
};

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  loading: false,

  fetchBoards: async (workspace?: string, q?: string) => {
    const fetchId = ++_latestBoardsFetchId;
    try {
      set({ loading: true });
      console.debug('useBoardStore.fetchBoards start', { workspace, q, fetchId });
      const boards = await boardService.list(workspace, q);
      console.debug('useBoardStore.fetchBoards result', { count: boards?.length ?? 0, fetchId });
      // only apply this result if it's the latest fetch
      if (fetchId !== _latestBoardsFetchId) {
        console.debug('useBoardStore.fetchBoards ignored outdated result', { fetchId, latest: _latestBoardsFetchId });
        return;
      }
      set({ boards });
    } catch (err) {
      if (fetchId === _latestBoardsFetchId) {
        console.error('fetchBoards error', err);
        toast.error('Không thể tải bảng.');
      } else {
        console.debug('fetchBoards error ignored (outdated fetch)');
      }
    } finally {
      if (fetchId === _latestBoardsFetchId) set({ loading: false });
    }
  },

  addBoard: async (payload) => {
    try {
      set({ loading: true });
      const b = await boardService.create(payload);
      set((s) => ({ boards: [b, ...s.boards] }));
      toast.success('Tạo bảng thành công');
      return b;
    } catch (err) {
      console.error('addBoard error', err);
      toast.error('Tạo bảng thất bại');
    } finally {
      set({ loading: false });
    }
  },

  updateBoard: async (id, payload) => {
    try {
      set({ loading: true });
      const updated = await boardService.update(id, payload);
      set((s) => ({ boards: s.boards.map((b) => (b._id === id ? updated : b)) }));
      toast.success('Cập nhật bảng thành công');
      return updated;
    } catch (err) {
      console.error('updateBoard error', err);
      toast.error('Cập nhật bảng thất bại');
    } finally {
      set({ loading: false });
    }
  },

  removeBoard: async (id) => {
    try {
      set({ loading: true });
      await boardService.remove(id);
      set((s) => ({ boards: s.boards.filter((b) => b._id !== id) }));
      toast.success('Xóa bảng thành công');
    } catch (err) {
      console.error('removeBoard error', err);
      toast.error('Xóa bảng thất bại');
    } finally {
      set({ loading: false });
    }
  },
}));

export default useBoardStore;
