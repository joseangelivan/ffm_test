
import { redirect } from 'next/navigation';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import AdminLoginClient from '@/components/admin-login-client';

export default async function AdminLoginPage() {
    const session = await getCurrentSession();

    // If the user is already logged in as an admin, redirect them directly from the server.
    // This is the most robust way to handle this, preventing the login page from even rendering for authenticated admins.
    if (session && session.type === 'admin') {
        redirect('/admin/dashboard');
    }

    // The server component now renders a client component responsible for the form and Suspense.
    return <AdminLoginClient authenticateAdmin={authenticateAdmin} />;
}
