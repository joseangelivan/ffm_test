
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import { getCurrentSession } from '@/lib/session';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Fetch all necessary data on the server before rendering the client component
  const [{ isValid: isSessionValid }, settings] = await Promise.all([
    verifySessionIntegrity(),
    getSettings()
  ]);
  
  return <AdminDashboardClient session={session} isSessionValid={isSessionValid} initialSettings={settings} />;
}
