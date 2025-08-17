
import { getSession } from '@/lib/auth';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { redirect } from 'next/navigation';

// This is the Server Component part of the page.
export default async function CondominioDashboardPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  // It renders the Client Component, passing the necessary props.
  return <CondoDashboardClient condoId={params.id} />;
}
