
import { Suspense } from 'react';
import { getCurrentSession } from '@/actions/auth';
import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';

export default async function AdminEnterPasswordPage({
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
            <AdminEnterPasswordForm email={email} />
        </Suspense>
    );
}
