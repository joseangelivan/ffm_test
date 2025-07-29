
import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import Loading from '@/app/loading';

export default async function AdminLoginPage() {
    const session = await getCurrentSession();

    // If the user is already logged in as an admin, redirect them directly from the server.
    // This is the most robust way to handle this, preventing the login page from even rendering for authenticated admins.
    if (session && session.type === 'admin') {
        redirect('/admin/dashboard');
    }

    // If there's no session, render the login form within a Suspense boundary.
    // Suspense will handle the loading state and the redirect after a successful form submission.
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm authenticateAdmin={authenticateAdmin} />
        </Suspense>
    );
}
