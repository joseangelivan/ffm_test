
'use client';

import { Suspense } from 'react';
import { authenticateAdmin } from '@/actions/auth';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';

export default function AdminLoginPage() {
    // The server component now renders a client component responsible for the form and Suspense.
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm authenticateAdmin={authenticateAdmin} />
        </Suspense>
    );
}
