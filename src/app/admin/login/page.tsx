
import AdminLoginForm from '@/components/admin-login-form';
import { Suspense } from 'react';
import Loading from '@/app/loading';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AdminLoginPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (session?.type === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <Suspense fallback={<Loading />}>
      <AdminLoginForm />
    </Suspense>
  );
}
