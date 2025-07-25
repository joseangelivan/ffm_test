
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/actions/auth';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/admin/login');
  }
  
  return <AdminDashboardClient session={session} />;
}
