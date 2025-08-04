import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await verifySession();

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    cookies().set('session', '', { expires: new Date(0) });
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
