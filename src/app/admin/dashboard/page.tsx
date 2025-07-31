
import { verifySessionIntegrity } from '@/actions/admin';
import { getCurrentSession } from '@/lib/session';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/admin/login');
  }

  const { isValid: isSessionValid } = await verifySessionIntegrity();
  
  return <AdminDashboardClient session={session} isSessionValid={isSessionValid} />;
}
