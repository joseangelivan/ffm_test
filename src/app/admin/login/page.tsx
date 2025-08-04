import AdminLoginForm from '@/components/admin-login-form';
import { Suspense } from 'react';
import Loading from '@/app/loading';
import { DbInitializer } from '@/components/admin/db-initializer';

// This page now handles the init_db search parameter to show the
// database initialization UI, or the standard login form.
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  
  const shouldInitializeDb = searchParams?.init_db === 'true';

  return (
    <Suspense fallback={<Loading />}>
      {shouldInitializeDb ? (
        <DbInitializer />
      ) : (
        <AdminLoginForm />
      )}
    </Suspense>
  );
}
