
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/app/loading';

type Session = {
    id: string;
    email: string;
    name: string;
    canCreateAdmins: boolean;
    type: 'admin' | 'resident' | 'gatekeeper';
}

interface LoginGuardProps {
    session: Session | null;
    userType: 'admin' | 'resident' | 'gatekeeper';
    redirectTo: string;
    children: React.ReactNode;
}

export default function LoginGuard({ session, userType, redirectTo, children }: LoginGuardProps) {
    const router = useRouter();
    const [isSessionChecked, setIsSessionChecked] = useState(false);

    useEffect(() => {
        if (session && session.type === userType) {
            router.push(redirectTo);
        } else {
            setIsSessionChecked(true);
        }
    }, [session, userType, redirectTo, router]);

    if (session && session.type === userType) {
        return <Loading />;
    }

    if (!isSessionChecked) {
        return <Loading />;
    }
    
    return <>{children}</>;
}
