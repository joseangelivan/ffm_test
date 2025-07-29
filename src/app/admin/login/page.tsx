
'use client';

import React, { useEffect, useState, Suspense } from 'react';
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
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        getCurrentSession().then(s => {
            const currentSession = s as Session | null;
            if (currentSession && currentSession.type === 'admin') {
                router.push('/admin/dashboard');
            } else {
                setIsCheckingSession(false);
            }
        });
    }, [router]);

    if (isCheckingSession) {
        return <Loading />;
    }
    
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm authenticateAdmin={authenticateAdmin} />
        </Suspense>
    );
}
