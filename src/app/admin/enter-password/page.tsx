
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';


// This is now a Server Component to handle session logic
export default async function AdminEnterPasswordPage({ searchParams }: { searchParams: { email?: string } }) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = await getSession(sessionToken);

  if (session?.type === 'admin') {
    redirect('/admin/dashboard');
  }
  
  const email = searchParams.email || '';

  if (!email) {
      redirect('/admin/login');
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <AdminEnterPasswordForm email={email} />
    </Suspense>
  );
}
