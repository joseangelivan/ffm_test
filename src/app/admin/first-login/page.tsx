
import { Suspense } from 'react';
import { getCurrentSession } from '@/actions/auth';
import AdminFirstLoginForm from '@/components/admin-first-login-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';

export default async function AdminFirstLoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const session = await getCurrentSession();
    if (session?.type === 'admin') {
        redirect('/admin/dashboard');
    }

    const email = typeof searchParams?.email === 'string' ? searchParams.email : '';

    return (
        <Suspense fallback={<Loading />}>
            <AdminFirstLoginForm initialEmail={email} />
        </Suspense>
    );
}
