
import { Suspense } from 'react';
import { initializeDatabase } from '@/lib/db';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Este componente se muestra después de que la inicialización de la BD se completa.
function InitDbMessage({ error }: { error?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card className="p-8 text-center max-w-2xl">
                {error ? (
                    <>
                        <h1 className="text-2xl font-bold text-destructive">Error de Inicialización</h1>
                        <p className="mt-2 text-muted-foreground">No se pudo inicializar la base de datos.</p>
                        <pre className="mt-4 text-left bg-muted p-4 rounded-md text-sm text-destructive overflow-auto text-wrap">
                            {error}
                        </pre>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-green-600">Base de Datos Inicializada</h1>
                        <p className="mt-2 text-muted-foreground">Las migraciones se han ejecutado correctamente.</p>
                    </>
                )}
                <Button asChild className="mt-6">
                    <Link href="/admin/login">Ir al Login</Link>
                </Button>
            </Card>
        </div>
    );
}

// Este componente maneja la lógica de inicialización de forma asíncrona.
async function DbInitializer() {
    const result = await initializeDatabase();
    if (result.success) {
      return <InitDbMessage />;
    } else {
      return <InitDbMessage error={result.message} />;
    }
}


// El componente de la página principal ahora es asíncrono y decide qué renderizar.
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | undefined };
}) {
  const initDb = searchParams?.init_db === 'true';

  return (
    <Suspense fallback={<Loading />}>
      {initDb ? <DbInitializer /> : <AdminLoginForm />}
    </Suspense>
  );
}
