
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';

type Session = {
    id: string;
    email: string;
    name: string;
    canCreateAdmins: boolean;
    type: 'admin' | 'resident' | 'gatekeeper';
}

function AdminLoginRedirector() {
    const router = useRouter();
    const [session, setSession] = React.useState<Session | null | undefined>(undefined);

    useEffect(() => {
        getCurrentSession().then(s => {
            setSession(s as Session | null);
        });
    }, []);

    useEffect(() => {
        if (session) {
            router.push('/admin/dashboard');
        }
    }, [session, router]);
    
    if (session === undefined || session) {
        return null;
    }

    return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}


export default function AdminLoginPage() {
  return <AdminLoginRedirector />;
}
