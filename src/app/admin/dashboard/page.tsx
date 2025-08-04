
import { redirect } from 'next/navigation';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    redirect('/admin/login');
  }

  const session = await getSession(sessionToken);

  if (!session) {
    // Si el token es inválido o expiró, borramos la cookie y redirigimos
    cookies().set('session', '', { expires: new Date(0) });
    redirect('/admin/login?error=session_invalidated');
  }

  // Verificamos si los datos de la sesión siguen coincidiendo con la base de datos
  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    // Si los datos no coinciden (ej. email o permisos cambiados), forzamos un nuevo login
    cookies().set('session', '', { expires: new Date(0) });
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  // Aseguramos que los settings nunca sean null para el componente cliente
  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
