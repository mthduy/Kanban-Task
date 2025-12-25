import api from '@/lib/axios';

export const authService = {
  register: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await api.post(
      '/auth/register',
      { username, password, email, firstName, lastName }
    );
    return res.data;
  },

  login: async (username: string, password: string) => {
    const res = await api.post(
      '/auth/login',
      { username, password },
      { withCredentials: true }
    );
    return res.data;
  },

  logout: async () => {
    return api.post('/auth/logout', {}, { withCredentials: true });
  },

  // Normalize user object from backend to frontend shape
  /* eslint-disable @typescript-eslint/no-explicit-any */
  normalizeUser: (raw: any): any => {
    if (!raw) return null;
    return {
      _id: raw._id ?? raw.id,
      username: raw.username,
      displayName: raw.displayName ?? raw.display_name ?? raw.name,
      email: raw.email,
      avatarUrl: raw.avatarUrl ?? raw.avatar ?? raw.avatar_url,
      avatarId: raw.avatarId ?? raw.avatar_id,
      phone: raw.phone,
      createdAt: raw.createdAt ?? raw.created_at,
      updatedAt: raw.updatedAt ?? raw.updated_at,
    };
  },
  /* eslint-enable @typescript-eslint/no-explicit-any */

  fetchMe: async () => {
    const res = await api.get('/users/me');
    return authService.normalizeUser(res.data.user);
  },

  updateProfile: async (data: {
    displayName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  }) => {
    const res = await api.put('/users/me', data, { withCredentials: true });
    return authService.normalizeUser(res.data.user);
  },

  uploadAvatar: async (file: File | Blob) => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await api.post('/users/me/avatar', form, {
      withCredentials: true,
    });
    return authService.normalizeUser(res.data.user);
  },

  refresh: async () => {
    const res = await api.post('/auth/refresh', {}, { withCredentials: true });
    return res.data.accessToken;
  },
};
