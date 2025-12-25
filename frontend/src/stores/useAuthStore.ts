import { create } from 'zustand';

// Module-scoped in-flight refresh guard to prevent concurrent refresh calls
let _ongoingRefresh: Promise<string | null> | null = null;
// Prevent showing the same "session expired" toast repeatedly
let _sessionExpiredToastShown = false;
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/authType/store';

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,

  setAccessToken: (accessToken) => {
    // Reset session-expired toast marker when we successfully set a token
    _sessionExpiredToastShown = false;
    set({ accessToken });
  },
  clearState: () => {
    // also reset session-expired toast marker when clearing auth
    _sessionExpiredToastShown = false;
    try {
      localStorage.removeItem('kanban_has_logged_in');
    } catch (e) {
      /* ignore */
    }
    set({ accessToken: null, user: null, loading: false });
  },

  signUp: async (
  username: string,
  password: string,
  email: string,
  firstName: string,
  lastName: string
) => {
  try {
    set({ loading: true });

    await authService.register(username, password, email, firstName, lastName);

    toast.success(
      'Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập.'
    );
    return { success: true };
  } catch (error: unknown) {
    console.error(error);

    const err = error as {
      response?: {
        status?: number;
        data?: { message?: string };
      };
    };

    let message = 'Đăng ký không thành công!';

    if (err.response?.status === 409) {
      const backendMsg = err.response.data?.message?.toLowerCase();

      if (backendMsg?.includes('username')) {
        message = 'Tên đăng nhập đã tồn tại!';
      } else if (backendMsg?.includes('email')) {
        message = 'Email đã được sử dụng!';
      } else {
        message = 'Tên đăng nhập hoặc email đã tồn tại!';
      }
    }

    toast.error(message);
    return { success: false, message };
  } finally {
    set({ loading: false });
  }
},

  login: async (username, password) => {
    try {
      set({ loading: true });

      const { accessToken } = await authService.login(username, password);
      get().setAccessToken(accessToken);
      try {
        localStorage.setItem('kanban_has_logged_in', '1');
      } catch (e) {
        /* ignore */
      }

      await get().fetchMe();

      toast.success(
        'Đăng nhập thành công! Chào mừng bạn quay lại với KanbanX.'
      );
    } catch (error) {
      console.error(error);
      toast.error('Đăng nhập không thành công!');
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      
      await authService.logout();
      get().clearState();
      toast.success('Đăng xuất thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi xảy ra khi đăng xuất. Hãy thử lại!');
    }
  },

 fetchMe: async (opts?: { silent?: boolean }) => {
  try {
    set({ loading: true });
    const user = await authService.fetchMe();
    set({ user });
  } catch (error) {
    console.error(error);
    set({ user: null, accessToken: null });
    if (!opts?.silent) {
      toast.error('Lỗi xảy ra khi lấy dữ liệu người dùng. Hãy thử lại!');
    }
  } finally {
    set({ loading: false });
  }
},


  // useAuthStore.ts
// useAuthStore.ts
refresh: async (opts?: { silent?: boolean }) => {
    // Use a module-scoped in-flight guard to avoid concurrent refresh calls
    // and avoid trying to read httpOnly cookies (can't be read reliably).
    try {
      set({ loading: true });

      // If a refresh is already ongoing, reuse its promise
      if (_ongoingRefresh) {
        // Wait for the ongoing refresh to finish, but don't return a value
        await _ongoingRefresh;
        return;
      }

      // Create and store the ongoing refresh promise so concurrent callers
      // reuse it and we avoid multiple network requests / toast spam.
      _ongoingRefresh = (async () => {
        try {
          const accessToken = await authService.refresh();
          get().setAccessToken(accessToken);

          // Only fetch user if we don't have it yet
          if (!get().user) {
            await get().fetchMe({ silent: opts?.silent });
          }

          return accessToken;
        } catch (err) {
          const e = err as { response?: { status?: number } };

          if (e.response?.status === 401 || e.response?.status === 403) {
            get().clearState();
            // show this toast at most once to avoid spam
            if (!opts?.silent && !_sessionExpiredToastShown) {
              _sessionExpiredToastShown = true;
              toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
            }
          } else {
            if (!opts?.silent) {
              toast.error('Lỗi kết nối. Vui lòng thử lại!');
            }
          }

          return null;
        }
      })();

  // Wait for the refresh to complete; callers don't receive the token here
  await _ongoingRefresh;
  return;
    } finally {
      // clear loading and the in-flight guard
      set({ loading: false });
      _ongoingRefresh = null;
    }
},




}));
