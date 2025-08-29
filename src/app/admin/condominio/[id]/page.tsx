
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { getCondominioById } from '@/actions/condos';
import { getDevicesByCondoId } from '@/actions/devices';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/actions/admin';
import { geocodeAddress } from '@/actions/geocoding';

export const dynamic = 'force-dynamic';

export default async function CondominioDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  // First, await the session to satisfy Next.js's requirement for using params.
  const session = await getSession();
  if (!session) {
    // This should be handled by middleware, but as a safeguard
    notFound();
  }

  // Await the params object before accessing its properties
  const { id } = await params;

  // Fetch all other data needed for the dashboard in parallel
  const [condoResult, devices, settings] = await Promise.all([
    getCondominioById(id),
    getDevicesByCondoId(id),
    getSettings(session),
  ]);

  if (!condoResult.success || !condoResult.data) {
    notFound();
  }
  
  const condo = condoResult.data;
  
  const initialSettings = settings || { theme: 'light', language: 'pt-BR' };

  return (
    <Suspense fallback={<Loading />}>
        <CondoDashboardClient 
            session={session}
            initialCondo={condo}
            initialDevices={devices}
            initialSettings={initialSettings}
        />
    </Suspense>
  );
}
