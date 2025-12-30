import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Settings, LogOut, Globe, Moon, Sun, Monitor, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuthStore } from '@/stores/useAuthStore';

export default function UserMenu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
    }
    return 'system';
  });

  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
        setShowLanguageMenu(false);
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setShowThemeMenu(false);
  };

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
        aria-label="User menu"
      >
        <Avatar className="w-10 h-10 ring-2 ring-[hsl(var(--primary))]/30 hover:ring-[hsl(var(--primary))]/60 transition-all duration-200 cursor-pointer">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {(user?.displayName?.[0] || user?.username?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-gray-700">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {(user?.displayName?.[0] || user?.username?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="py-1">
            {/* Profile */}
            <button
              onClick={() => {
                navigate('/profile');
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('user.profile')}
              </span>
            </button>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                  {t('user.settings')}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
              </button>

              {showSettings && (
                <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-b border-gray-200 dark:border-gray-700">
                  {/* Theme */}
                  <div className="relative">
                    <button
                      onClick={() => setShowThemeMenu(!showThemeMenu)}
                      className="w-full px-8 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      {theme === 'light' ? (
                        <Sun className="w-4 h-4 text-yellow-500" />
                      ) : theme === 'dark' ? (
                        <Moon className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Monitor className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {t('user.theme')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t(`theme.${theme}`)}
                      </span>
                    </button>

                    {showThemeMenu && (
                      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleThemeChange('light')}
                          className={`w-full px-12 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                            theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <Sun className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('theme.light')}
                          </span>
                          {theme === 'light' && (
                            <span className="ml-auto text-blue-500">✓</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleThemeChange('dark')}
                          className={`w-full px-12 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                            theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <Moon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('theme.dark')}
                          </span>
                          {theme === 'dark' && (
                            <span className="ml-auto text-blue-500">✓</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleThemeChange('system')}
                          className={`w-full px-12 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                            theme === 'system' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <Monitor className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('theme.system')}
                          </span>
                          {theme === 'system' && (
                            <span className="ml-auto text-blue-500">✓</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Language */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                      className="w-full px-8 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {t('user.language')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentLanguage.flag} {currentLanguage.code.toUpperCase()}
                      </span>
                    </button>

                    {showLanguageMenu && (
                      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full px-12 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                              i18n.language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {lang.name}
                            </span>
                            {i18n.language === lang.code && (
                              <span className="ml-auto text-blue-500">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {t('auth.logout')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
