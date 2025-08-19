
import AdminLoginForm from '@/components/admin-login-form';
import { Suspense } from 'react';
import Loading from '@/app/loading';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
  const session = await getSession();

  if (session?.type === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <Suspense fallback={<Loading />}>
      <AdminLoginForm />
    </Suspense>
  );
}
