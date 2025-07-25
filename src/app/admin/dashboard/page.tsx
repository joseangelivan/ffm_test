
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { getSession } from '@/actions/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  // The mock data is now managed within the client component.
  // We only need to pass the session data.
  return (
    <AdminDashboardClient session={session} />
  );
}
