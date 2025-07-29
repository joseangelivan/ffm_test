
import React, { Suspense } from 'react';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import Loading from '@/app/loading';
import LoginGuard from '@/components/login-guard';


export default async function AdminLoginPage() {
    const session = await getCurrentSession();

    return (
        <LoginGuard session={session} userType="admin" redirectTo="/admin/dashboard">
            <Suspense fallback={<Loading />}>
                <AdminLoginForm authenticateAdmin={authenticateAdmin} />
            </Suspense>
        </LoginGuard>
    );
}
