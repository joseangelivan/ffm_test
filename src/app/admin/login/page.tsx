
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, runMigrations } from '@/actions/auth';

export default async function AdminLoginPage() {
  await runMigrations();
  // La comprobación de sesión se elimina de aquí para evitar el error de renderizado dinámico.
  // La redirección si ya hay una sesión activa se manejará en el lado del cliente o en el middleware en una futura implementación.
  // El dashboard ya protege su propia ruta.

  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
