"use client";

import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/lib/i18n";

export function ThemeSwitcher() {
  const { t } = useLocale();

  // We use this state to avoid a flash of unstyled content.
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }

  React.useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
     if (storedTheme) {
      handleSetTheme(storedTheme);
    } else {
        // This part now runs only on the client, after mount.
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        handleSetTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);
  
  if (!mounted) {
      // Render a placeholder or null on the server and during the initial client render
      // to prevent hydration mismatch.
      return (
         <Button variant="ghost" size="icon" disabled>
              <Sun className="h-5 w-5" />
         </Button>
      );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetTheme('light')}>
          {t('dashboard.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme('dark')}>
          {t('dashboard.theme.dark')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
