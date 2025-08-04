
import { getSession } from '@/lib/session';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// This is the Server Component part of the page.
export default async function CondominioDashboardPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = await getSession(sessionToken);
  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  // It renders the Client Component, passing the necessary props.
  return <CondoDashboardClient condoId={params.id} />;
}
