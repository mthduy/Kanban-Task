import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/useThemeStore';

export default function SimpleThemeToggle() {
  const { theme, toggleTheme, isDark } = useThemeStore();

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="w-9 px-0" 
      onClick={toggleTheme}
      title={`Current: ${theme} | Click to toggle`}
    >
      {isDark ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  );
}