
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building,
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
import { geocodeAddress } from '@/actions/geocoding';

import ManageUsersTab from './condo/manage-users-tab';
import ManageDevicesTab from './condo/manage-devices-tab';
import CondoMapTab from './condo/condo-map-tab';
import { AdminHeader } from './admin/admin-header';
import { getDevicesByCondoId, type Device } from '@/actions/devices';
import { cn } from '@/lib/utils';
import type { SessionPayload } from '@/lib/session';
import { handleLogoutAction } from '@/lib/session';
import type { UserSettings } from '@/actions/admin';
import { getActiveTheme, updateSettings } from '@/actions/admin';
import { type Theme } from '@/actions/themes';


type Coords = { lat: number; lng: number };

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

export const CondoDashboardContext = React.createContext<{
  session: SessionPayload;
  condo: Condominio | null;
  handleSetLocale: (locale: 'es' | 'pt-BR') => void;
  handleSetTheme: (theme: string) => void;
  theme: string;
} | null>(null);

export const useCondoDashboard = () => {
    const context = React.useContext(CondoDashboardContext);
    if (!context) {
        throw new Error("useCondoDashboard must be used within a CondoDashboardProvider");
    }
    return context;
};


export default function CondoDashboardClient({ 
    condoId,
    session,
    initialSettings
}: { 
    condoId: string,
    session: SessionPayload,
    initialSettings: UserSettings 
}) {
  const { t, setLocale } = useLocale();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const [condo, setCondo] = useState<Condominio | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<Coords | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [theme, setTheme] = useState(initialSettings.theme);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);


  const applyTheme = useCallback(async (themeData: Theme | null, newThemeId: string) => {
    const root = document.documentElement;
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
    const themeData = await getActiveTheme({ theme: newThemeId, language: initialSettings.language });
    applyTheme(themeData, newThemeId);
    await updateSettings({ theme: newThemeId }, session);
  }, [applyTheme, initialSettings, session]);

  const handleSetLocale = async (newLocale: 'es' | 'pt-BR') => {
      setLocale(newLocale);
      await updateSettings({ language: newLocale }, session);
  }

  const fetchData = useCallback(async () => {
    if (!condo) {
      setLoading(true);
    }
    try {
        const [condoResult, devicesResult] = await Promise.all([
            getCondominioById(condoId),
            getDevicesByCondoId(condoId)
        ]);
        
        if (condoResult === undefined) {
          console.error("Failed to fetch condo data, server response was undefined.");
          setLoading(false);
          return;
        }

        if (condoResult.success && condoResult.data) {
            setCondo(condoResult.data);
            setDevices(devicesResult || []);

            if (!mapCenter) {
              const geoResult = await geocodeAddress({
                  street: condoResult.data.street!,
                  city: condoResult.data.city!,
                  state: condoResult.data.state!,
                  country: condoResult.data.country!,
              });

              if (geoResult.success && geoResult.data && geoResult.data.length > 0) {
                  const { lat, lng } = geoResult.data[0].geometry.location;
                  setMapCenter({ lat, lng });
              } else {
                  console.warn("Could not geocode address for map center.");
                  setMapCenter({ lat: -23.5505, lng: -46.6333 }); // Fallback
              }
            }
        } else {
            console.error(condoResult.message);
        }
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
    } finally {
        setLoading(false);
    }
  }, [condoId, mapCenter, condo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    async function applyInitialSettings() {
        setLocale(initialSettings.language);
        setTheme(initialSettings.theme);
        const themeData = await getActiveTheme(initialSettings);
        applyTheme(themeData, initialSettings.theme);
    }
    applyInitialSettings();
  }, [initialSettings, setLocale, applyTheme]);
  
  const handleAccountUpdateSuccess = useCallback((data: any) => {
    if (data?.needsLogout) {
      setShowLogoutDialog(true);
    }
  }, []);

  if (loading && !condo) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Loader className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  if (!condo) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
          <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
                <CardDescription>No se pudo cargar la información del condominio.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/admin/dashboard">
                    <Button>Volver al Panel</Button>
                </Link>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <CondoDashboardContext.Provider value={{ session, condo, handleSetLocale, handleSetTheme, theme }}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AdminHeader onAccountUpdateSuccess={handleAccountUpdateSuccess} />

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
          <div className="grid gap-4">
            <div>
              <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t('condoDashboard.backToAdmin')}
              </Link>
              <div className="flex items-center gap-4 mt-2">
                  <Building className="h-8 w-8 text-primary"/>
                  <div>
                      <h1 className="text-3xl font-bold tracking-tight">{condo.name}</h1>
                      <p className="text-muted-foreground">{condo.address}</p>
                  </div>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4"/>{t('condoDashboard.tabs.users')}</TabsTrigger>
                <TabsTrigger value="devices" className="flex items-center gap-2"><Smartphone className="h-4 w-4"/>{t('condoDashboard.tabs.devices')}</TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2"><Map className="h-4 w-4"/>{t('condoDashboard.tabs.map')}</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                  <div className={cn(activeTab !== 'users' && 'hidden')}>
                      <ManageUsersTab condoId={condo.id} />
                  </div>
                  <div className={cn(activeTab !== 'devices' && 'hidden')}>
                      <ManageDevicesTab condoId={condo.id} devices={devices} onDataNeedsRefresh={fetchData} />
                  </div>
                  <div className={cn(activeTab !== 'map' && 'hidden')}>
                      {apiKey ? (
                          <APIProvider apiKey={apiKey} libraries={['drawing', 'geocoding']}>
                          {mapCenter ? (
                              <CondoMapTab condo={condo} center={mapCenter} />
                          ) : (
                              <Card>
                                  <CardHeader>
                                      <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                              <Loader className="h-5 w-5 animate-spin" />
                                              <span>{t('condoDashboard.map.loadingMap')}</span>
                                          </div>
                                      </div>
                                  </CardContent>
                              </Card>
                          )}
                          </APIProvider>
                      ) : (
                      <Card>
                          <CardHeader>
                              <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                              <CardDescription>{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyMissing')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center text-center p-4">
                                  <p className="text-sm text-muted-foreground">{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyInstructions')}</p>
                              </div>
                          </CardContent>
                      </Card>
                      )}
                  </div>
              </div>
            </Tabs>
          </div>
        </main>
        <ForceLogoutDialog 
            isOpen={showLogoutDialog}
            onConfirm={handleLogoutAction}
        />
      </div>
    </CondoDashboardContext.Provider>
  );
}
