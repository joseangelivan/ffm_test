

import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/session';
import { getDbPool } from '@/lib/db';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const session = await getCurrentSession();
    if (session?.type === 'admin') {
        redirect('/admin/dashboard');
    }

    if (searchParams?.init_db === 'true') {
        try {
            await getDbPool(true); // Pass true to trigger migrations
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
        } catch (error: any) {
             return (
                <div className="flex min-h-screen items-center justify-center bg-background">
                    <Card className="p-8 text-center">
                        <h1 className="text-2xl font-bold text-destructive">Error de Inicialización</h1>
                        <p className="mt-2 text-muted-foreground">No se pudo inicializar la base de datos.</p>
                        <pre className="mt-4 text-left bg-muted p-4 rounded-md text-sm text-destructive overflow-auto">
                            {error.message}
                        </pre>
                         <Button asChild className="mt-6">
                            <Link href="/admin/login">Volver</Link>
                        </Button>
                    </Card>
                </div>
            );
        }
    }

    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm />
        </Suspense>
    );
}
