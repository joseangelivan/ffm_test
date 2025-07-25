
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getSession, runMigrations } from '@/actions/auth';
import { cookies } from 'next/headers';

export default async function AdminLoginPage() {
  await runMigrations();

  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session');
  const session = await getSession(sessionToken?.value);

  if (session) {
    redirect('/admin/dashboard');
  }

  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
