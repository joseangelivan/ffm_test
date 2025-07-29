
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';

export default async function AdminLoginPage() {
    const session = await getCurrentSession();

    if (session && session.type === 'admin') {
        redirect('/admin/dashboard');
    }

    // The server component now renders a client component responsible for the form and Suspense.
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm authenticateAdmin={authenticateAdmin} />
        </Suspense>
    );
}
