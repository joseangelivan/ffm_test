
import AdminLoginForm from '@/components/admin-login-form';
import { Suspense } from 'react';
import Loading from '@/app/loading';

// The page is now a simple Server Component that renders the login form.
// The complex logic for DB initialization has been removed to solve the
// persistent Next.js error with dynamic searchParams.
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Loading />}>
        <AdminLoginForm />
    </Suspense>
  );
}
