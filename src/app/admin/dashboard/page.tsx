import { getCurrentSession } from '@/actions/auth';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { redirect } from 'next/navigation';

// This is a server component. We will get the session here,
// but the client component will be responsible for handling settings and UI logic.
export default async function AdminDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/admin/login');
  }
  
  // The client component will handle the redirect if the session is null.
  // This approach keeps the server component clean and avoids dynamic rendering issues.
  return <AdminDashboardClient session={session} />;
}
