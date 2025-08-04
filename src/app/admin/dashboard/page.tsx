
import { getDashboardData } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { cookies } from 'next/headers';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const { session, initialSettings } = await getDashboardData(sessionToken);

  return <AdminDashboardClient session={session} initialSettings={initialSettings} />;
}
