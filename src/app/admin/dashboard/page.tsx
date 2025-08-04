import { redirect } from 'next/navigation';
import { getSession, verifySession } from '@/lib/auth';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await verifySession(); // This will redirect if no session is found
  if (!session) {
    // verifySession will redirect, but for type safety and clarity, we can add this.
    return null;
  }

  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    // The session might be stale or tampered with.
    // Purge the invalid cookie and redirect to login.
    // This logic is now in verifySession, but as a fallback:
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  // If for some reason settings are null (e.g., DB error), we provide a default
  // This prevents the client component from crashing.
  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
