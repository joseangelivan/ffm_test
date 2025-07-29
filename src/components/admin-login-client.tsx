
'use client';

import { Suspense } from 'react';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';

interface AdminLoginClientProps {
    authenticateAdmin: (prevState: any, formData: FormData) => Promise<any>;
}

// This new client component wraps the form in Suspense.
// This is the correct pattern to handle server actions with redirects that are initiated from a client component.
export default function AdminLoginClient({ authenticateAdmin }: AdminLoginClientProps) {
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm authenticateAdmin={authenticateAdmin} />
        </Suspense>
    );
}
