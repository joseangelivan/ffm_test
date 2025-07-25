
import { redirect } from 'next/navigation';
import { getSession } from '@/actions/auth';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { cookies } from 'next/headers';

type Session = {
    id: string;
    email: string;
    name: string;
}

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session');
  const session = await getSession(sessionToken?.value);

  if (!session) {
    redirect('/admin/login');
  }
  
  return <AdminDashboardClient session={session} />;
}
