
import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/session';
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

    const email = (searchParams?.email as string) || '';

    if (!email) {
        redirect('/admin/login');
    }

    return (
        <Suspense fallback={<Loading />}>
            <AdminFirstLoginForm initialEmail={email} />
        </Suspense>
    );
}
