
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
  const [mounted, setMounted] = React.useState(false);

  // Attempt to get context from either dashboard.
  const adminContext = React.useContext(AdminDashboardContext);
  const condoContext = React.useContext(CondoDashboardContext);
  const context = adminContext || condoContext;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    if (context && context.handleSetTheme) {
      // If we are inside a dashboard, use the context's handler
      context.handleSetTheme(newTheme);
    } else {
      // Fallback for pages without context (like login page)
      // This directly manipulates the DOM, which is acceptable for this simple case.
      document.documentElement.classList.remove('light', 'dark');
      if (newTheme !== 'light' && newTheme !== 'dark') {
         // This assumes custom themes are always dark-based for simplicity on login pages
         document.documentElement.classList.add('dark');
      } else {
         document.documentElement.classList.add(newTheme);
      }
    }
  };

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
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          {t('dashboard.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          {t('dashboard.theme.dark')}
        </DropdownMenuItem>
        {/* For simplicity, custom themes are not listed on context-less pages */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
