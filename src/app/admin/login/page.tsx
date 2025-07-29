
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import Loading from '@/app/loading';

type Session = {
    id: string;
    email: string;
    name: string;
    canCreateAdmins: boolean;
    type: 'admin' | 'resident' | 'gatekeeper';
}

export default function AdminLoginPage() {
    const router = useRouter();
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        getCurrentSession().then(s => {
            const currentSession = s as Session | null;
            if (currentSession) {
                router.push('/admin/dashboard');
            } else {
                setIsCheckingSession(false);
            }
            setSession(currentSession);
        });
    }, [router]);

    if (isCheckingSession) {
        return <Loading />;
    }
    
    // If there's no session, show the login form.
    // The redirection logic is handled by the effect above.
    return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
