
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
  const sessionCookie = cookies().get('session');
  const sessionToken = sessionCookie?.value;
  const session = await getSession(sessionToken);

  if (!session) {
    redirect('/admin/login');
  }
  
  return <AdminDashboardClient session={session} />;
}
