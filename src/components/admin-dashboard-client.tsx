
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { useLocale } from '@/lib/i18n';
import { UserSettings, getActiveTheme, updateSettings } from '@/actions/admin';
import { handleLogoutAction, type SessionPayload } from '@/lib/session';
import { AdminHeader } from './admin/admin-header';
import { CondoManagement } from './admin/condo-management';
import { type Theme } from '@/actions/themes';


function LoadingOverlay({ text }: { text: string }) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{text}</span>
            </div>
        </div>
    );
}

function ForceLogoutDialog({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) {
    const { t } = useLocale();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleConfirm = () => {
        setIsLoggingOut(true);
        onConfirm();
    };

    if (!isOpen) return null;

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('adminDashboard.account.logoutDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('adminDashboard.account.logoutDialog.description')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button onClick={handleConfirm} disabled={isLoggingOut}>
                        {isLoggingOut && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        {t('adminDashboard.account.logoutDialog.confirm')}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export const AdminDashboardContext = React.createContext<{
    session: SessionPayload,
    handleSetLocale: (locale: 'es' | 'pt-BR') => void,
    handleSetTheme: (theme: string) => void,
    theme: string,
} | null>(null);

export function useAdminDashboard() {
    const context = React.useContext(AdminDashboardContext);
    if (!context) {
        throw new Error("useAdminDashboard must be used within an AdminDashboardProvider");
    }
    return context;
}

type DashboardState = {
    session: SessionPayload;
    initialSettings: UserSettings;
};


export default function AdminDashboardClient({ session, initialSettings }: DashboardState) {
  const { setLocale, t } = useLocale();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [theme, setTheme] = useState(initialSettings.theme || 'light');
  const router = useRouter();
  
  const applyTheme = useCallback(async (themeData: Theme | null, newThemeId: string) => {
    const root = document.documentElement;
    root.style.cssText = '';

    const defaultThemeVars = [
      'background', 'foreground', 'card', 'card-foreground', 
      'popover', 'popover-foreground', 'primary', 'primary-foreground', 
      'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 
      'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 
      'border', 'input', 'ring'
    ];

    const clearCustomTheme = () => {
      defaultThemeVars.forEach(v => root.style.removeProperty(`--${v}`));
    };

    if (newThemeId === 'dark' || newThemeId === 'light') {
        clearCustomTheme();
        root.classList.toggle('dark', newThemeId === 'dark');
    } else if (themeData) {
        clearCustomTheme();
        Object.entries(themeData).forEach(([key, value]) => {
            if (key.endsWith('_hsl') && value) {
                const cssVar = `--${key.replace('_hsl', '').replace(/_/g, '-')}`;
                root.style.setProperty(cssVar, value);
            }
        });
        if (!root.classList.contains('dark')) {
            root.classList.add('dark');
        }
    } else {
        clearCustomTheme();
        root.classList.remove('dark');
    }
  }, []);

  const handleSetTheme = useCallback(async (newThemeId: string) => {
    setTheme(newThemeId);
    const themeData = await getActiveTheme({ ...initialSettings, theme: newThemeId });
    applyTheme(themeData, newThemeId);
    await updateSettings({ theme: newThemeId }, session);
    // Force a re-render of the layout to apply new styles
    router.refresh();
  }, [applyTheme, initialSettings, session, router]);


  useEffect(() => {
    setLocale(initialSettings.language);
  }, [initialSettings.language, setLocale]);

  const handleSetLocale = async (newLocale: 'es' | 'pt-BR') => {
      setLocale(newLocale);
      await updateSettings({ language: newLocale }, session);
      router.refresh();
  }

  const handleAccountUpdateSuccess = useCallback((data: any) => {
    if (data?.needsLogout) {
      setShowLogoutDialog(true);
    } else {
        router.refresh();
    }
  }, [router]);
  
  if (!session || !initialSettings) {
      return <LoadingOverlay text={t('dashboard.title')} />;
  }

  return (
    <AdminDashboardContext.Provider value={{ session, handleSetLocale, handleSetTheme, theme }}>
        <div className="flex min-h-screen w-full flex-col bg-muted/40 relative">
        <AdminHeader onAccountUpdateSuccess={handleAccountUpdateSuccess} />
        
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
            <CondoManagement />
        </main>
            
        <ForceLogoutDialog 
            isOpen={showLogoutDialog}
            onConfirm={async () => {
                await handleLogoutAction();
                router.push('/admin/login');
            }}
        />
        </div>
    </AdminDashboardContext.Provider>
  );
}
