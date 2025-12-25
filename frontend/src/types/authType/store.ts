import type { User } from './user';

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;

  setAccessToken: (accessToken: string) => void;
  clearState: () => void;

  signUp: (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; message?: string }>;

  login: (username: string, password: string) => Promise<void>;

  logout: () => Promise<void>;

  fetchMe: (opts?: { silent?: boolean }) => Promise<void>;

  refresh: (opts?: { silent?: boolean }) => Promise<void>;
}
