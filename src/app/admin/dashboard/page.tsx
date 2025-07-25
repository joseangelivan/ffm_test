import { getCurrentSession } from '@/actions/auth';
import AdminDashboardClient from '@/components/admin-dashboard-client';

// This is a server component. We will get the session here,
// but the client component will be responsible for handling settings and UI logic.
export default async function AdminDashboardPage() {
  const session = await getCurrentSession();
  
  // The client component will handle the redirect if the session is null.
  // This approach keeps the server component clean and avoids dynamic rendering issues.
  return <AdminDashboardClient initialSession={session} />;
}
