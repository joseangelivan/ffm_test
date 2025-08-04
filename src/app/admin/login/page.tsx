
'use client';

import { Suspense, useEffect, useState } from 'react';
import { getCurrentSession } from '@/lib/session';
import { getDbPool } from '@/lib/db';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';
import { redirect, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function InitDbMessage({ error }: { error?: string }) {
    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Card className="p-8 text-center max-w-2xl">
                    <h1 className="text-2xl font-bold text-destructive">Error de Inicialización</h1>
                    <p className="mt-2 text-muted-foreground">No se pudo inicializar la base de datos.</p>
                    <pre className="mt-4 text-left bg-muted p-4 rounded-md text-sm text-destructive overflow-auto text-wrap">
                        {error}
                    </pre>
                    <Button asChild className="mt-6">
                        <Link href="/admin/login">Volver</Link>
                    </Button>
                </Card>
            </div>
        );
    }
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card className="p-8 text-center">
                <h1 className="text-2xl font-bold text-green-600">Base de Datos Inicializada</h1>
                <p className="mt-2 text-muted-foreground">Las migraciones se han ejecutado correctamente.</p>
                <Button asChild className="mt-6">
                    <Link href="/admin/login">Ir al Login</Link>
                </Button>
            </Card>
        </div>
    );
}

function AdminLoginPageContent() {
    const [initResult, setInitResult] = useState<{inProgress: boolean, error?: string, done: boolean}>({inProgress: true, done: false});
    const searchParams = useSearchParams();
    const initDb = searchParams.get('init_db') === 'true';

    useEffect(() => {
        const checkSession = async () => {
            const session = await getCurrentSession();
            if (session?.type === 'admin') {
                redirect('/admin/dashboard');
            }
        };
        checkSession();
    }, []);

    useEffect(() => {
        async function initializeDatabase() {
            if (!initDb) {
                setInitResult({inProgress: false, done: false});
                return;
            };

            try {
                await getDbPool(true);
                setInitResult({inProgress: false, done: true});
            } catch (error: any) {
                setInitResult({inProgress: false, error: error.message, done: true});
            }
        }
        initializeDatabase();
    }, [initDb]);

    if (initDb) {
        if(initResult.inProgress) return <Loading />;
        if(initResult.done) return <InitDbMessage error={initResult.error} />;
    }

    return <AdminLoginForm />;
}


export default function AdminLoginPage() {
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginPageContent />
        </Suspense>
    );
}
