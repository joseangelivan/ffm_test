
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
import { AdminDashboardContext } from "@/contexts/admin-dashboard-context";
import { CondoDashboardContext } from "@/contexts/condo-dashboard-context";

export function ThemeSwitcher() {
  const { t } = useLocale();

  // Attempt to get context from either dashboard.
  const adminContext = React.useContext(AdminDashboardContext);
  const condoContext = React.useContext(CondoDashboardContext);

  const context = adminContext || condoContext;
  
  // Local state for pages without context (like login)
  const [localTheme, setLocalTheme] = React.useState<'light' | 'dark'>('light');

  // Determine the current theme
  const theme = context ? context.theme : localTheme;
  const handleSetTheme = context?.handleSetTheme;

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Client-side theme handling for non-context pages (e.g. login)
    if (!context) {
        const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (storedTheme) {
            setLocalTheme(storedTheme);
            document.documentElement.classList.toggle('dark', storedTheme === 'dark');
        } else {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            setLocalTheme(systemTheme);
            document.documentElement.classList.toggle('dark', systemTheme === 'dark');
        }
    }
  }, [context]);

  const onThemeChange = (newTheme: 'light' | 'dark') => {
    if (handleSetTheme) {
        handleSetTheme(newTheme);
    } else {
        // Fallback for non-context pages
        setLocalTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  }

  if (!mounted) {
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
        <DropdownMenuItem onClick={() => onThemeChange('light')}>
          {t('dashboard.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onThemeChange('dark')}>
          {t('dashboard.theme.dark')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
