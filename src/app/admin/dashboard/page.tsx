
import { getDashboardData } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export default async function AdminDashboardPage() {
  const { session, initialSettings } = await getDashboardData();
  
  return <AdminDashboardClient session={session} initialSettings={initialSettings} />;
}
