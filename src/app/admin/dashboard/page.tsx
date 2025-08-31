
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSettings, verifySessionIntegrity } from '@/actions/admin';
import AdminDashboardClient from '@/components/admin-dashboard-client';
import { getSession } from '@/lib/auth';
import { handleLogoutAction } from '@/lib/session';
import Loading from '@/app/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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

  if (!initialSettings) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error de Conexión</AlertTitle>
                <AlertDescription>
                    No se pudo cargar la configuración del usuario. Es posible que haya un problema con la conexión a la base de datos. Por favor, recarga la página.
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  // Ensure settings are never null for the client component
  const settings = initialSettings || { theme: 'light', language: 'pt-BR' };

  return (
    <Suspense fallback={<Loading />}>
      <AdminDashboardClient session={session} initialSettings={settings} />
    </Suspense>
  );
}

    