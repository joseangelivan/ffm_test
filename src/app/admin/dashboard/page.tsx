
import { redirect } from 'next/navigation';
import { getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session || session.type !== 'admin') {
    // This check is redundant if middleware is active, but good for safety.
    redirect('/admin/login');
  }

  const initialSettings = await getSettings(session);

  // Ensure settings are never null for the client component
  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
