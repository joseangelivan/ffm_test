
import { Suspense } from 'react';
import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { redirect } from 'next/navigation';

// This is now a simple Server Component.
// Session checks are handled by middleware or in the layout/actions.
export default async function AdminEnterPasswordPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams.email || '';

  // If email is not in the URL, we can't proceed.
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
