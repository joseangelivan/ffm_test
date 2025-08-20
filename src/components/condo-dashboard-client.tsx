
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Smartphone,
  Users,
  Map,
  Loader,
} from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { getCondominioById, type Condominio } from '@/actions/condos';

import ManageUsersTab from './condo/manage-users-tab';
import ManageDevicesTab from './condo/manage-devices-tab';
import CondoMapTab from './condo/condo-map-tab';
import { AdminHeader } from './admin/admin-header';
import { getDevicesByCondoId, type Device } from '@/actions/devices';
import { cn } from '@/lib/utils';
import type { SessionPayload } from '@/lib/session';
import { handleLogoutAction } from '@/lib/session';
import type { UserSettings } from '@/actions/admin';
import { getActiveTheme, updateSettings, getSettings } from '@/actions/admin';
import { type Theme } from '@/actions/themes';
import { CondoDashboardContext } from '@/contexts/condo-dashboard-context';


type CondoDashboardClientProps = {
    session: SessionPayload;
    initialCondo: Condominio;
    initialDevices: Device[];
    initialSettings: UserSettings;
};

export default function CondoDashboardClient({ session, initialCondo, initialDevices, initialSettings }: CondoDashboardClientProps) { 
  const { t, setLocale } = useLocale();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const router = useRouter();

  const [condo, setCondo] = useState<Condominio>(initialCondo);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  
  const [activeTab, setActiveTab] = useState('users');
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
    router.refresh();
  }, [applyTheme, initialSettings, session, router]);

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

  const onDataNeedsRefresh = useCallback(async () => {
    if (condo?.id) {
        const devicesResult = await getDevicesByCondoId(condo.id);
        setDevices(devicesResult);
    }
  }, [condo?.id]);

  useEffect(() => {
    setLocale(initialSettings.language);
    setTheme(initialSettings.theme);
  }, [initialSettings, setLocale]);


  const handleConfirmLogout = async () => {
    await handleLogoutAction();
  };

  const providerValue = {
    handleSetLocale,
    handleSetTheme,
    theme,
    condo,
  };

  return (
    <CondoDashboardContext.Provider value={providerValue}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AdminHeader 
            session={session}
            condoName={condo.name}
            onAccountUpdateSuccess={handleAccountUpdateSuccess}
            onLogout={handleLogoutAction}
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
                      <ManageUsersTab condoId={condo.id} />
                  </TabsContent>
                  <TabsContent value="devices" forceMount className={cn(activeTab !== 'devices' && 'hidden')}>
                      <ManageDevicesTab condoId={condo.id} devices={devices} onDataNeedsRefresh={onDataNeedsRefresh} />
                  </TabsContent>
                  <TabsContent value="map" forceMount className={cn(activeTab !== 'map' && 'hidden')}>
                      {apiKey ? (
                          <APIProvider apiKey={apiKey} libraries={['drawing', 'geocoding']}>
                            <CondoMapTab condo={condo} />
                          </APIProvider>
                      ) : (
                      <Card>
                          <CardHeader>
                              <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                          </CardHeader>
                          <CardContent>
                               <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                                  <p className="text-sm text-muted-foreground text-center p-4">{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyInstructions')}</p>
                              </div>
                          </CardContent>
                      </Card>
                      )}
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
    </CondoDashboardContext.Provider>
  );
}
