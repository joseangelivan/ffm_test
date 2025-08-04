
import { redirect } from 'next/navigation';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { cookies } from 'next/headers';
import { getSession as getSessionFromToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    redirect('/admin/login');
  }

  const session = await getSessionFromToken(sessionToken);

  if (!session) {
    cookieStore.set('session', '', { expires: new Date(0) });
    redirect('/admin/login?error=session_invalidated');
  }

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    cookies().set('session', '', { expires: new Date(0) });
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
