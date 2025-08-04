
import AdminDashboardClient from '@/components/admin-dashboard-client';

export default function AdminDashboardPage() {
  // This page is now a simple wrapper. 
  // All data fetching and logic is handled in the client component
  // via a Server Action to avoid dynamic rendering issues on this route.
  return <AdminDashboardClient />;
}

