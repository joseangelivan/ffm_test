
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { verifySessionIntegrity, getSettings } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';

export default async function AdminDashboardPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (!session || session.type !== 'admin') {
    redirect('/admin/login');
  }

  // Se realiza una validación de sesión en el servidor para una capa extra de seguridad.
  // Si falla, redirige inmediatamente.
  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    cookies().delete('session');
    redirect('/admin/login');
  }

  const initialSettings = await getSettings(session);

  return <AdminDashboardClient session={session} initialSettings={initialSettings} />;
}
