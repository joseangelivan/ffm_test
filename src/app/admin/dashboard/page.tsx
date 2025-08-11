
import { redirect } from 'next/navigation';
import { getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await verifySession(sessionToken);

  if (!session) {
    // This check is redundant if middleware is active, but good for safety.
    redirect('/admin/login');
  }

  const initialSettings = await getSettings(session);

  // Aseguramos que los settings nunca sean null para el componente cliente
  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
