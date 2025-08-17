
import { Suspense } from 'react';
import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';

// This is now a simple Server Component.
// It renders the client component that will handle fetching searchParams.
export default function AdminEnterPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminEnterPasswordForm />
    </Suspense>
  );
}
