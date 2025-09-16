

import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { getCondominioById } from '@/actions/condos';
import { getDevicesByCondoId } from '@/actions/devices';
import { getSession } from '@/lib/auth';
import { getSettings, getDefaultMapProvider, getGeofencesByCondoId } from '@/actions/admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Map } from 'lucide-react';
import { processAndGetConfig } from '@/actions/map_providers';

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

  if (!rawMapProvider) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <div className="flex flex-col items-center gap-4 text-center">
                 <div className="rounded-full border border-dashed p-4 bg-background">
                    <Map className="h-12 w-12 text-muted-foreground" />
                </div>
                <Alert variant="default" className="max-w-lg text-left">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No se encontró un proveedor de mapas</AlertTitle>
                    <AlertDescription>
                        No hay un proveedor de mapas predeterminado configurado en el sistema. Por favor, vaya al panel de administración y configure uno para continuar.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
  }

  // Process the map provider config on the server to inject environment variables
  const mapProvider = await processAndGetConfig(rawMapProvider);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const condo = condoResult.data;
  
  const defaultGeofence = geofences.find(g => g.is_default);
  
  let initialPosition = { lat: -14.235, lng: -51.9253 }; // Fallback to Brazil center
  
  if (defaultGeofence?.geometry?.center) {
      initialPosition = { lat: defaultGeofence.geometry.center[1], lng: defaultGeofence.geometry.center[0] };
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
          googleMapsApiKey={googleMapsApiKey}
          initialPosition={initialPosition}
        />
    </Suspense>
  );
}
