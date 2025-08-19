
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { getCondominioById } from '@/actions/condos';
import { getDevicesByCondoId } from '@/actions/devices';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/actions/admin';
import type { UserSettings } from '@/actions/admin';

export const dynamic = 'force-dynamic';

async function CondoDataLoader({ condoId }: { condoId: string }) {
  const session = await getSession();
  if (!session) {
    // This should be handled by middleware, but as a safeguard
    notFound();
  }

  // Fetch all data needed for the dashboard
  const [condoResult, devices, settings] = await Promise.all([
    getCondominioById(condoId),
    getDevicesByCondoId(condoId),
    getSettings(session),
  ]);

  if (!condoResult.success || !condoResult.data) {
    notFound();
  }

  const initialSettings = settings || { theme: 'light', language: 'pt-BR' };

  return (
    <CondoDashboardClient 
      session={session}
      initialCondo={condoResult.data}
      initialDevices={devices}
      initialSettings={initialSettings}
    />
  );
}


export default function CondominioDashboardPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<Loading />}>
      <CondoDataLoader condoId={params.id} />
    </Suspense>
  );
}
