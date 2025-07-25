
import { redirect } from 'next/navigation';
import { getSession } from '@/actions/auth';
import AdminDashboardClient from '@/components/admin-dashboard-client';

type Session = {
    id: string;
    email: string;
    name: string;
}

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }
  
  return <AdminDashboardClient session={session} />;
}
