
"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cookies } from 'next/headers';

function EnterPasswordPageContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    
    useEffect(() => {
      async function checkSession() {
          const cookieStore = cookies()
          const sessionToken = cookieStore.get('session')?.value
          const session = await getSession(sessionToken)
          if (session?.type === 'admin') {
              redirect('/admin/dashboard');
          }
          if (!email) {
              redirect('/admin/login');
          }
      }
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
