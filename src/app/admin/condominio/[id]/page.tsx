

import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { getCondominioById } from '@/actions/condos';
import { getDevicesByCondoId } from '@/actions/devices';
import { getSession } from '@/lib/auth';
import { getSettings, getDefaultMapProvider } from '@/actions/admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function CondoDashboard({ condoId }: { condoId: string }) {
  const session = await getSession();
  if (!session) {
    // This case should be handled by middleware, but as a safeguard.
    notFound();
  }

  // Fetch all data needed for the dashboard in parallel
  const [condoResult, devices, settings, mapProvider] = await Promise.all([
    getCondominioById(condoId),
    getDevicesByCondoId(condoId),
    getSettings(session),
    getDefaultMapProvider()
  ]);

  if (!condoResult.success || !condoResult.data || !settings) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de Conexión</AlertTitle>
          <AlertDescription>
            No se pudo cargar la información del condominio o la configuración del usuario. Es posible que haya un problema con la conexión a la base de datos. Por favor, recarga la página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const condo = condoResult.data;
  const initialSettings = settings || { theme: 'light', language: 'pt-BR' };

  return (
    <CondoDashboardClient
      session={session}
      initialCondo={condo}
      initialDevices={devices}
      initialSettings={initialSettings}
      mapProvider={mapProvider}
    />
  );
}


export default async function CondominioDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <CondoDashboard condoId={id} />
    </Suspense>
  );
}
