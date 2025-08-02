
"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams, redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/session';
import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

function EnterPasswordPageContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    
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

    return <AdminEnterPasswordForm email={email} />;
}


export default function AdminEnterPasswordPage() {
    return (
        <Suspense fallback={<Loading />}>
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>
            <EnterPasswordPageContent />
        </Suspense>
    );
}
