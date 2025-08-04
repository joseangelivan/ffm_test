
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const sessionToken = cookies().get('session')?.value;

  if (!sessionToken) {
    redirect('/admin/login');
  }

  const session = await getSession(sessionToken);

  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  return <AdminDashboardClient session={session} initialSettings={initialSettings} />;
}
