
import { Suspense } from 'react';
import { initializeDatabase } from '@/lib/db';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Componente que se encarga de la inicialización de la base de datos.
// Es asíncrono y se renderiza dentro de un Suspense.
async function DbInitializer() {
    const result = await initializeDatabase();

    // Este componente se muestra después de que la inicialización se completa.
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card className="p-8 text-center max-w-2xl">
                {result.success ? (
                    <>
                        <h1 className="text-2xl font-bold text-green-600">Base de Datos Inicializada</h1>
                        <p className="mt-2 text-muted-foreground">Las migraciones se han ejecutado correctamente.</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-destructive">Error de Inicialización</h1>
                        <p className="mt-2 text-muted-foreground">No se pudo inicializar la base de datos.</p>
                        <pre className="mt-4 text-left bg-muted p-4 rounded-md text-sm text-destructive overflow-auto text-wrap">
                            {result.message}
                        </pre>
                    </>
                )}
                <Button asChild className="mt-6">
                    <Link href="/admin/login">Ir al Login</Link>
                </Button>
            </Card>
        </div>
    );
}

// El componente de la página principal ahora es asíncrono y decide qué renderizar.
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Leemos el parámetro de la URL. Si es 'true', mostramos el inicializador.
  const initDb = searchParams?.init_db === 'true';

  if (initDb) {
    // Envolvemos el componente asíncrono en Suspense para que Next.js lo maneje correctamente.
    return (
      <Suspense fallback={<Loading />}>
        <DbInitializer />
      </Suspense>
    );
  }

  // Si no se está inicializando la BD, simplemente mostramos el formulario de login.
  return <AdminLoginForm />;
}
