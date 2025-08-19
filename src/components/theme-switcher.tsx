
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
import { AdminDashboardContext } from "./admin-dashboard-client";
import { CondoDashboardContext } from "@/contexts/condo-dashboard-context";

export function ThemeSwitcher() {
  const { t } = useLocale();

  // Attempt to get context from either dashboard.
  const adminContext = React.useContext(AdminDashboardContext);
  const condoContext = React.useContext(CondoDashboardContext);

  const context = adminContext || condoContext;
  const theme = context?.theme;
  const handleSetTheme = context?.handleSetTheme;

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Client-side theme handling for non-admin pages
    if (!context) {
        const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (storedTheme) {
            document.documentElement.classList.toggle('dark', storedTheme === 'dark');
        } else {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.classList.toggle('dark', systemPrefersDark);
        }
    }
  }, [context]);

  const onThemeChange = (newTheme: string) => {
    if (handleSetTheme) {
        handleSetTheme(newTheme);
    } else {
        // Fallback for non-admin pages
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
