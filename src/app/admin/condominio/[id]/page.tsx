
import { Suspense } from 'react';
import Loading from '@/app/loading';
import CondoDashboardClient from '@/components/condo-dashboard-client';

export const dynamic = 'force-dynamic';

// This is now a simple Server Component that suspends the client component.
export default function CondominioDashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CondoDashboardClient />
    </Suspense>
  );
}
