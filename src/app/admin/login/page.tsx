
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getSession } from '@/actions/auth';
import { cookies } from 'next/headers';


export default async function AdminLoginPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (session) {
    redirect('/admin/dashboard');
  }

  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
