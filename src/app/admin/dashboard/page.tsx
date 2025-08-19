
import { redirect } from 'next/navigation';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { getSession } from '@/lib/auth';
import { handleLogoutAction } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  // Verify session integrity
  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    await handleLogoutAction();
    redirect('/admin/login');
  }

  const initialSettings = await getSettings(session);

  // Ensure settings are never null for the client component
  const settings = initialSettings || { theme: 'light', language: 'pt-BR' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
