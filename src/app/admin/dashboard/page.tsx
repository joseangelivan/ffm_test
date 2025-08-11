
import { redirect } from 'next/navigation';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
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

  // Verificamos si los datos de la sesión siguen coincidiendo con la base de datos
  const isSessionValid = await verifySessionIntegrity(session);
  if (!isSessionValid) {
    // Si los datos no coinciden (ej. email o permisos cambiados), forzamos un nuevo login
    // NO se puede modificar la cookie aquí. Se redirige y el middleware/siguiente acción se encarga.
    redirect('/admin/login?error=session_invalidated');
  }

  const initialSettings = await getSettings(session);

  // Aseguramos que los settings nunca sean null para el componente cliente
  const settings = initialSettings || { theme: 'light', language: 'pt' };

  return <AdminDashboardClient session={session} initialSettings={settings} />;
}
