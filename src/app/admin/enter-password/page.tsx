
"use client";

import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/session';
import { AdminEnterPasswordForm } from '@/components/admin-enter-password-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AdminEnterPasswordPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const email = (searchParams?.email as string) || '';
    
    // This check must happen outside of the main return for the redirect to work.
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
