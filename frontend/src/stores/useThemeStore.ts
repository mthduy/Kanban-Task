import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
      return true;
    } else {
      root.classList.remove('dark');
      return false;
    }
  } else if (theme === 'dark') {
    root.classList.add('dark');
    return true;
  } else {
    root.classList.remove('dark');
    return false;
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isDark: false,
      setTheme: (theme: Theme) => {
        const isDark = applyTheme(theme);
        set({ theme, isDark });
      },
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
        const isDark = applyTheme(newTheme);
        set({ theme: newTheme, isDark });
      }
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isDark = applyTheme(state.theme);
          state.isDark = isDark;
        }
      },
    }
  )
);

// Initialize theme on page load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('theme-storage');
  const theme = stored ? JSON.parse(stored).state.theme : 'system';
  applyTheme(theme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      const isDark = applyTheme('system');
      useThemeStore.setState({ isDark });
    }
  });
}