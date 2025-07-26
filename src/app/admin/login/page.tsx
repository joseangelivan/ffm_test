
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect('/admin/dashboard');
  }

  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
