
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin, getCurrentSession } from '@/actions/auth';
import Loading from './loading';

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
    
    if (session === undefined) {
        return <Loading />;
    }
    
    if (session) {
        // This will be briefly shown while router.push() is processing
        return <Loading />;
    }

    return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}


export default function AdminLoginPage() {
  return <AdminLoginRedirector />;
}
