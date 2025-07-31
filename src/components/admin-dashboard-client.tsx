
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
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
import { updateSettings, verifySessionIntegrity } from '@/actions/admin';
import { handleLogoutAction } from '@/lib/session';
import { AdminHeader } from './admin/admin-header';
import { CondoManagement } from './admin/condo-management';

type Session = {
    id: string;
    email: string;
    name: string;
    canCreateAdmins: boolean;
    type: 'admin' | 'resident' | 'gatekeeper';
}

type UserSettings = {
    theme: 'light' | 'dark';
    language: 'es' | 'pt';
} | null;


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
    session: Session,
    theme: 'light' | 'dark',
    handleSetTheme: (theme: 'light' | 'dark') => void,
    handleSetLocale: (locale: 'es' | 'pt') => void,
} | null>(null);

export const useAdminDashboard = () => {
    const context = React.useContext(AdminDashboardContext);
    if (!context) {
        throw new Error("useAdminDashboard must be used within an AdminDashboardProvider");
    }
    return context;
};

export default function AdminDashboardClient({ 
    session, 
    isSessionValid: initialIsSessionValid,
    initialSettings 
}: { 
    session: Session, 
    isSessionValid: boolean,
    initialSettings: UserSettings
}) {
  const { setLocale } = useLocale();
  const [isSessionValid, setIsSessionValid] = useState(initialIsSessionValid);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialSettings?.theme || 'light');

  // Set initial theme and language from server-provided props
  useEffect(() => {
    if (initialSettings) {
      setTheme(initialSettings.theme);
      setLocale(initialSettings.language);
      document.documentElement.classList.toggle('dark', initialSettings.theme === 'dark');
    }
  }, [initialSettings, setLocale]);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    await updateSettings({ theme: newTheme });
  }

  const handleSetLocale = async (newLocale: 'es' | 'pt') => {
      setLocale(newLocale);
      await updateSettings({ language: newLocale });
  }

  const handleAccountUpdateSuccess = useCallback((data: any) => {
    if (data?.needsLogout) {
      setShowLogoutDialog(true);
    }
  }, []);

  useEffect(() => {
    if (!initialIsSessionValid) {
        setShowLogoutDialog(true);
    }
  }, [initialIsSessionValid]);

  if (!isSessionValid) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 relative">
             <LoadingOverlay text="Verificando sesión..." />
             <ForceLogoutDialog 
                isOpen={true}
                onConfirm={handleLogoutAction}
            />
        </div>
    )
  }

  return (
    <AdminDashboardContext.Provider value={{ session, theme, handleSetTheme, handleSetLocale }}>
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
