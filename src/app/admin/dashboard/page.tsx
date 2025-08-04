
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    redirect('/admin/login');
  }

  const session = await getSession(sessionToken);

  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    // The session might be stale or tampered with.
    // Purge the invalid cookie and redirect to login.
    cookies().delete('session');
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  // If for some reason settings are null (e.g., DB error), we provide a default
  // This prevents the client component from crashing.
  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
