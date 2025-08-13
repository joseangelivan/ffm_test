
"use client";

import React, { useState, useEffect } from 'react';
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
import { useLocale } from '@/lib/i18n';
import { getCondominioById, type Condominio } from '@/actions/condos';
import { geocodeAddress } from '@/actions/geocoding';

import ManageUsersTab from './condo/manage-users-tab';
import ManageDevicesTab from './condo/manage-devices-tab';
import CondoMapTab from './condo/condo-map-tab';

// Mock data will be passed to the new components
const mockDevices = [
  { id: 'dev-01', name: 'Tracker Portão 1', type: 'esp32', status: 'Online', token: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8' },
  { id: 'dev-02', name: 'Câmera Corredor A', type: 'other', status: 'Online', token: 'b2c3d4e5-f6g7-8901-h2i3-j4k5l6m7n8o9' },
  { id: 'dev-03', name: 'Relógio Segurança', type: 'watch', status: 'Offline', token: 'c3d4e5f6-g7h8-9012-i3j4-k5l6m7n8o9p0' },
];

type Coords = { lat: number; lng: number };

export default function CondoDashboardClient({ condoId }: { condoId: string }) {
  const { t } = useLocale();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [condo, setCondo] = useState<Condominio | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<Coords | null>(null);

  useEffect(() => {
    async function fetchCondoAndCoords() {
      const result = await getCondominioById(condoId);
      
      if (result.success && result.data) {
        setCondo(result.data);
        const geoResult = await geocodeAddress({
          street: result.data.street!,
          city: result.data.city!,
          state: result.data.state!,
          country: result.data.country!,
        });

        if (geoResult.success && geoResult.data && geoResult.data.length > 0) {
            const { lat, lng } = geoResult.data[0].geometry.location;
            setMapCenter({ lat, lng });
        } else {
            console.warn("Could not geocode address for map center.");
            setMapCenter({ lat: -23.5505, lng: -46.6333 }); // Fallback
        }

      } else {
        console.error(result.message);
      }
      setLoading(false);
    }
    fetchCondoAndCoords();
  }, [condoId]);

  if (loading) {
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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
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
          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4"/>{t('condoDashboard.tabs.users')}</TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2"><Smartphone className="h-4 w-4"/>{t('condoDashboard.tabs.devices')}</TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2"><Map className="h-4 w-4"/>{t('condoDashboard.tabs.map')}</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-4">
              <ManageUsersTab condoId={condo.id} />
            </TabsContent>
            <TabsContent value="devices" className="mt-4">
              <ManageDevicesTab initialDevices={mockDevices} />
            </TabsContent>
             <TabsContent value="map" className="mt-4">
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
