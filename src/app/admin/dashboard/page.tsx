
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import { getSession } from '@/lib/session';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AdminDashboardPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (!session) {
    redirect('/admin/login');
  }

  // Fetch all necessary data on the server before rendering the client component
  const [{ isValid: isSessionValid }, settings] = await Promise.all([
    verifySessionIntegrity(),
    getSettings()
  ]);
  
  if (!isSessionValid) {
      redirect('/admin/login?error=session_invalidated');
  }
  
  return <AdminDashboardClient session={session} isSessionValid={isSessionValid} initialSettings={settings} />;
}
