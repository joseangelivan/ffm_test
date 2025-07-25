
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession, runMigrations } from '@/actions/auth';

export default async function AdminLoginPage() {
  await runMigrations();
  const session = await getCurrentSession();

  if (session) {
    redirect('/admin/dashboard');
  }

  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
