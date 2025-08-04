
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

import { initializeDatabase } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocale } from '@/lib/i18n';

export function DbInitializer() {
    const { t } = useLocale();
    const [state, setState] = useState<{ status: 'loading' | 'success' | 'error'; message?: string }>({ status: 'loading' });

    useEffect(() => {
        async function runInit() {
            const result = await initializeDatabase();
            if (result.success) {
                setState({ status: 'success' });
            } else {
                setState({ status: 'error', message: result.message });
            }
        }
        runInit();
    }, []);

    const renderContent = () => {
        switch (state.status) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center gap-4">
                        <Loader className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">Initializing database and running migrations...</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex flex-col items-center gap-4">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="font-semibold text-center">Database initialized successfully!</p>
                        <p className="text-sm text-muted-foreground text-center">All tables have been created and default data has been seeded.</p>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center gap-4 w-full">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                         <Alert variant="destructive" className="w-full">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                            <AlertDescription variant="destructive">{state.message}</AlertDescription>
                        </Alert>
                    </div>
                );
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg shadow-xl">
                 <CardHeader>
                    <CardTitle className="text-center text-2xl">Database Initialization</CardTitle>
                    <CardDescription className="text-center">
                        Please wait while we set up the database for you.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    {renderContent()}
                </CardContent>
                {state.status !== 'loading' && (
                    <CardContent>
                         <Link href="/admin/login" className="w-full">
                            <Button className="w-full">Go to Admin Login</Button>
                        </Link>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
