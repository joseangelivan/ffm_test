
import { getSession } from '@/lib/auth';
import { getSettings, verifySessionIntegrity, UserSettings } from '@/actions/admin';
import CondoDashboardClient from '@/components/condo-dashboard-client';
import { handleLogoutAction } from '@/lib/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// This is the Server Component part of the page.
export default async function CondominioDashboardPage({ params }: { params: { id: string } }) {
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

  // Fetch admin settings
  const initialSettings = await getSettings(session);
  const settings: UserSettings = initialSettings || { theme: 'light', language: 'pt-BR' };

  // It renders the Client Component, passing the necessary props.
  return <CondoDashboardClient condoId={params.id} session={session} initialSettings={settings} />;
}
