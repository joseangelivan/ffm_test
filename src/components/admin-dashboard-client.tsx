
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Loader,
  AlertCircle,
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
import { cn } from '@/lib/utils';
import { UserSettings, updateSettings, getDashboardData } from '@/actions/admin';
import { handleLogoutAction, type SessionPayload } from '@/lib/session';
import { AdminHeader } from './admin/admin-header';
import { CondoManagement } from './admin/condo-management';
import { getThemes } from '@/actions/themes';


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

const AdminDashboardContext = React.createContext<{ 
    session: SessionPayload,
    handleSetLocale: (locale: 'es' | 'pt') => void,
    handleSetTheme: (theme: string) => void,
    theme: string,
} | null>(null);

export const useAdminDashboard = () => {
    const context = React.useContext(AdminDashboardContext);
    if (!context) {
        throw new Error("useAdminDashboard must be used within an AdminDashboardProvider");
    }
    return context;
};


type DashboardState = {
    session: SessionPayload;
    isSessionValid: boolean;
    initialSettings: UserSettings | null;
} | null;


export default function AdminDashboardClient() {
  const [dashboardState, setDashboardState] = useState<DashboardState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setLocale, t } = useLocale();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [theme, setTheme] = useState('light');
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
        try {
            const data = await getDashboardData();
            setDashboardState(data);
            if (data.initialSettings) {
                setLocale(data.initialSettings.language);
                handleSetTheme(data.initialSettings.theme);
            }
        } catch (error) {
            // getDashboardData will redirect on its own if session is invalid
            console.error("Failed to load dashboard data, a redirect should have occurred.", error);
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [setLocale]);

  const handleSetLocale = async (newLocale: 'es' | 'pt') => {
      setLocale(newLocale);
      await updateSettings({ language: newLocale });
  }

    const applyTheme = useCallback(async (themeId: string) => {
        if (themeId === 'light' || themeId === 'dark') {
            document.documentElement.classList.toggle('dark', themeId === 'dark');
            // Clear custom properties if any
            const root = document.documentElement;
            const customThemeVars = ['--background','--foreground','--card','--card-foreground','--popover','--popover-foreground','--primary','--primary-foreground','--secondary','--secondary-foreground','--muted','--muted-foreground','--accent','--accent-foreground','--destructive','--destructive-foreground','--border','--input','--ring'];
            for (const v of customThemeVars) {
                root.style.removeProperty(`${v}-custom`);
            }
        } else {
            const themes = await getThemes();
            const customTheme = themes.find(t => t.id === themeId);
            if(customTheme) {
                const root = document.documentElement;
                for (const [key, value] of Object.entries(customTheme)) {
                    if (key.endsWith('_hsl')) {
                        const cssVar = `--${key.replace('_hsl', '').replace(/_/g, '-')}-custom`;
                        root.style.setProperty(cssVar, value);
                    }
                }
                document.documentElement.classList.add('dark'); // or light depending on base
            } else {
                 document.documentElement.classList.remove('dark');
            }
        }
    }, []);

  const handleSetTheme = useCallback(async (newThemeId: string) => {
    setTheme(newThemeId);
    applyTheme(newThemeId);
    await updateSettings({ theme: newThemeId });
  }, [applyTheme]);

  const handleAccountUpdateSuccess = useCallback((data: any) => {
    if (data?.needsLogout) {
      setShowLogoutDialog(true);
    }
  }, []);

  if (isLoading) {
      return <LoadingOverlay text="Cargando panel..." />;
  }
  
  if (!dashboardState || !dashboardState.session) {
      // This should ideally not be reached as getDashboardData redirects.
      // But as a fallback, we can redirect here as well.
      router.push('/admin/login');
      return <LoadingOverlay text="Redirigiendo..." />;
  }

  return (
    <AdminDashboardContext.Provider value={{ session: dashboardState.session, handleSetLocale, handleSetTheme, theme }}>
        <div className="flex min-h-screen w-full flex-col bg-muted/40 relative">
        <AdminHeader onAccountUpdateSuccess={handleAccountUpdateSuccess} />
        
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
            <CondoManagement />
        </main>
            
        <ForceLogoutDialog 
            isOpen={showLogoutDialog}
            onConfirm={handleLogoutAction}
        />
        </div>
    </AdminDashboardContext.Provider>
  );
}

