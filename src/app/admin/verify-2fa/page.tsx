
"use client";

import { Suspense, useEffect } from 'react';
import { getCurrentSession } from '@/lib/session';
import { AdminVerify2faForm } from '@/components/admin-verify-2fa-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AdminVerify2faPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const email = (searchParams?.email as string) || '';
    
    useEffect(() => {
      const checkSession = async () => {
          const session = await getCurrentSession();
          if (session?.type === 'admin') {
              redirect('/admin/dashboard');
          }
          if (!email) {
              redirect('/admin/login');
          }
      };
      checkSession();
    }, [email]);

    if (!email) {
        return <Loading />;
    }
    
    return (
        <Suspense fallback={<Loading />}>
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>
            <AdminVerify2faForm email={email} />
        </Suspense>
    );
}
