

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Smartphone,
  Users,
  Map,
  Loader,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { useLocale } from '@/lib/i18n';
import { type Condominio } from '@/actions/condos';

import ManageUsersTab from './condo/manage-users-tab';
import ManageDevicesTab from './condo/manage-devices-tab';
import CondoMapTab from './condo/map/condo-map-tab';
import { AdminHeader } from './admin/admin-header';
import { type Device } from '@/actions/devices';
import { cn } from '@/lib/utils';
import type { SessionPayload } from '@/lib/session';
import { handleLogoutAction } from '@/lib/session';
import type { UserSettings } from '@/actions/admin';
import { getActiveTheme, updateSettings } from '@/actions/admin';
import { type Theme } from '@/actions/themes';
import { type MapProvider } from '@/actions/map_providers';

type CondoDashboardClientProps = {
    session: SessionPayload;
    initialCondo: Condominio & { geofences: any[] };
    initialDevices: Device[];
    initialSettings: UserSettings;
    mapProvider: MapProvider;
    initialPosition: { lat: number; lng: number };
};

export default function CondoDashboardClient({ session, initialCondo, initialDevices, initialSettings, mapProvider, initialPosition }: CondoDashboardClientProps) { 
  const { t, setLocale } = useLocale();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('map');
  const [theme, setTheme] = useState(initialSettings.theme);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
    
    // A custom theme is always dark.
    if (newThemeId === 'dark' || themeData) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    if (newThemeId !== 'light' && newThemeId !== 'dark' && themeData) {
        Object.entries(themeData).forEach(([key, value]) => {
            if (key.endsWith('_hsl') && value) {
                const cssVar = `--${key.replace('_hsl', '').replace(/_/g, '-')}`;
                root.style.setProperty(cssVar, value);
            }
        });
    } else {
      clearCustomTheme();
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
    const setInitialTheme = async () => {
        const themeData = await getActiveTheme(initialSettings);
        applyTheme(themeData, initialSettings.theme);
    };
    setInitialTheme();
  }, [initialSettings, applyTheme]);


  const handleAccountUpdateSuccess = useCallback((data: any) => {
    if (data?.needsLogout) {
      setShowLogoutDialog(true);
    } else {
      router.refresh();
    }
  }, [router]);
  
  useEffect(() => {
    setLocale(initialSettings.language);
    setTheme(initialSettings.theme);
  }, [initialSettings, setLocale]);


  const handleConfirmLogout = async () => {
    await handleLogoutAction();
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AdminHeader 
            session={session}
            condoName={initialCondo.name}
            onAccountUpdateSuccess={handleAccountUpdateSuccess}
        />

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
          <div className="grid gap-4">
            <div>
              <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t('condoDashboard.backToAdmin')}
              </Link>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4"/>{t('condoDashboard.tabs.users')}</TabsTrigger>
                <TabsTrigger value="devices" className="flex items-center gap-2"><Smartphone className="h-4 w-4"/>{t('condoDashboard.tabs.devices')}</TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2"><Map className="h-4 w-4"/>{t('condoDashboard.tabs.map')}</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                  <TabsContent value="users" forceMount className={cn(activeTab !== 'users' && 'hidden')}>
                      <ManageUsersTab condoId={initialCondo.id} initialUsers={[]}/>
                  </TabsContent>
                  <TabsContent value="devices" forceMount className={cn(activeTab !== 'devices' && 'hidden')}>
                      <ManageDevicesTab condoId={initialCondo.id} initialDevices={initialDevices} />
                  </TabsContent>
                  <TabsContent value="map" forceMount className={cn(activeTab !== 'map' && 'hidden')}>
                      <CondoMapTab 
                        condo={initialCondo} 
                        initialPosition={initialPosition} 
                        provider={mapProvider} 
                      />
                  </TabsContent>
              </div>
            </Tabs>
          </div>
        </main>
        
        <AlertDialog open={showLogoutDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('adminDashboard.account.logoutDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('adminDashboard.account.logoutDialog.description')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button onClick={handleConfirmLogout}>
                        {t('adminDashboard.account.logoutDialog.confirm')}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
