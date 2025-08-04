
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    // We can't delete the cookie here as it's a server component after a redirect might have started
    // The redirect alone is sufficient for now. Better session invalidation can be handled in middleware.
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  return <AdminDashboardClient session={session} initialSettings={initialSettings} />;
}
