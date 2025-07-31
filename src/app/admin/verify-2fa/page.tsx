
import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/session';
import { AdminVerify2faForm } from '@/components/admin-verify-2fa-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';

export default async function AdminVerify2faPage({
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
            <AdminVerify2faForm email={email} />
        </Suspense>
    );
}
