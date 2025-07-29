

import { Suspense } from 'react';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
    // This server-side logic handles redirection before rendering.
    // However, to keep it simple and robust against HMR issues,
    // we'll let the dashboard handle redirection if a user is already logged in.
    // const session = await getCurrentSession();
    // if (session?.type === 'admin') {
    //     redirect('/admin/dashboard');
    // }

    // Using Suspense is the correct pattern for server actions that redirect.
    // It allows Next.js to handle the response from the server action gracefully.
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm authenticateAdmin={authenticateAdmin} />
        </Suspense>
    );
}
