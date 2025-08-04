
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = await getSession(sessionToken);

  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    cookies().delete('session');
    redirect('/admin/login');
  }

  const initialSettings = await getSettings(session);

  return <AdminDashboardClient session={session} initialSettings={initialSettings} />;
}
