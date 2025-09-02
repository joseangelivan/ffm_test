

import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { getCondominioById } from '@/actions/condos';
import { getDevicesByCondoId } from '@/actions/devices';
import { getSession } from '@/lib/auth';
import { getSettings, getDefaultMapProvider, getGeofencesByCondoId } from '@/actions/admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { geocodeAddress } from '@/actions/geocoding';

export const dynamic = 'force-dynamic';

export default async function CondominioDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    notFound();
  }

  const awaitedParams = await params;
  const condoId = awaitedParams.id;

  const condoResult = await getCondominioById(condoId);

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

  const condo = condoResult.data;

  const fetchAndSetCondoPosition = async () => {
    const geoResult = await geocodeAddress({
        street: `${condo.street}, ${condo.number}`,
        city: condo.city,
        state: condo.state,
        country: condo.country,
    });
    if (geoResult.success && geoResult.data && geoResult.data.length > 0) {
        return geoResult.data[0].geometry.location
    }
    return { lat: 0, lng: 0 };
  }

  // Fetch all other data needed for the dashboard in parallel
  const [devices, settings, mapProvider, initialPosition, geofences] = await Promise.all([
    getDevicesByCondoId(condoId),
    getSettings(session),
    getDefaultMapProvider(),
    fetchAndSetCondoPosition(),
    getGeofencesByCondoId(condoId)
  ]);

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
  
  const condoWithGeofences = { ...condo, geofences: geofences || [] };

  return (
    <Suspense fallback={<Loading />}>
        <CondoDashboardClient
          session={session}
          initialCondo={condoWithGeofences}
          initialDevices={devices}
          initialSettings={settings}
          mapProvider={mapProvider}
          initialPosition={initialPosition}
        />
    </Suspense>
  );
}
