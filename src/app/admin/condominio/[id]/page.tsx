

import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { getCondominioById, updateCondoCoordinates } from '@/actions/condos';
import { getDevicesByCondoId } from '@/actions/devices';
import { getSession } from '@/lib/auth';
import { getSettings, getDefaultMapProvider, getGeofencesByCondoId, processAndGetConfig } from '@/actions/admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { geocodeAddress } from '@/actions/geocoding';

export const dynamic = 'force-dynamic';

export default async function CondominioDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    notFound();
  }
  
  const { id: condoId } = await params;

  // Fetch all initial data in parallel
  const [condoResult, devices, settings, rawMapProvider, geofences] = await Promise.all([
    getCondominioById(condoId),
    getDevicesByCondoId(condoId),
    getSettings(session),
    getDefaultMapProvider(),
    getGeofencesByCondoId(condoId)
  ]);

  if (!condoResult.success || !condoResult.data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de Carga</AlertTitle>
          <AlertDescription>
            No se pudo encontrar el condominio especificado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de Conexión</AlertTitle>
          <AlertDescription>
            No se pudo cargar la configuración del usuario. Es posible que haya un problema con la conexión a la base de datos. Por favor, recarga la página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Process the map provider config on the server to inject environment variables
  const mapProvider = rawMapProvider ? await processAndGetConfig(rawMapProvider) : null;

  const condo = condoResult.data;
  
  let initialMapConfig: { center: { lat: number; lng: number }; zoom: number; } | null = null;
  let mapConfigError: string | null = null;
  
  const defaultGeofence = geofences.find(g => g.is_default);

  if (!defaultGeofence) {
    if (condo.latitude && condo.longitude) {
      initialMapConfig = { center: { lat: condo.latitude, lng: condo.longitude }, zoom: 17 };
    } else {
        const fullAddress = [condo.street, condo.number, condo.city, condo.state, condo.country].filter(Boolean).join(', ');
        const geocodeResult = await geocodeAddress(fullAddress);

        if (geocodeResult.success && geocodeResult.data) {
            initialMapConfig = { center: { lat: geocodeResult.data.lat, lng: geocodeResult.data.lon }, zoom: 17 };
            // Fire-and-forget update
            updateCondoCoordinates(condo.id, initialMapConfig.center.lat, initialMapConfig.center.lng);
        } else {
            console.warn(`Geocoding failed for condo ${condo.id}: ${geocodeResult.message}`);
            mapConfigError = geocodeResult.message || "No se pudieron obtener las coordenadas para la dirección del condominio.";
            // Provide a fallback view centered on the general country if geocoding fails
            initialMapConfig = { center: { lat: -14.235, lng: -51.9253 }, zoom: 4 };
        }
    }
  }


  const condoWithGeofences = { ...condo, geofences: geofences || [] };
  
  return (
    <Suspense fallback={<Loading />}>
        <CondoDashboardClient
          session={session}
          initialCondo={condoWithGeofences}
          initialDevices={devices}
          initialSettings={settings}
          mapProvider={mapProvider}
          initialMapConfig={initialMapConfig}
          mapConfigError={mapConfigError}
        />
    </Suspense>
  );
}
