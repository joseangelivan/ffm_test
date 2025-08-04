
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

import { AdminVerify2faForm } from '@/components/admin-verify-2fa-form';
import Loading from '@/app/loading';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';


export default async function AdminVerify2faPage({ searchParams }: { searchParams: { email?: string } }) {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session');
    const session = await getSession(sessionToken?.value);

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
            <AdminVerify2faForm email={email} />
        </Suspense>
    );
}
