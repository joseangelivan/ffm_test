
"use client";

import React, { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Database, AlertCircle, Loader, CheckCircle, ListChecks, ServerCrash, Terminal } from 'lucide-react';
import { initializeDatabase, type DbInitResult } from '@/lib/db-initializer';
import { useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    {t('dbInitializer.loading')}
                </>
            ) : (
                <>
                    <Database className="mr-2 h-4 w-4" />
                    {t('dbInitializer.button')}
                </>
            )}
        </Button>
    );
}

function LogEntry({ logLine }: { logLine: string }) {
    const parts = logLine.split(':');
    const type = parts[0];
    const message = parts.slice(1).join(':').trim();

    let Icon = ListChecks;
    let colorClass = "text-blue-600 dark:text-blue-400";
    if (type === 'SUCCESS' || type === 'END') {
        Icon = CheckCircle;
        colorClass = "text-green-600 dark:text-green-400";
    } else if (type === 'ERROR' || type === 'FATAL' || type === 'CRITICAL') {
        Icon = ServerCrash;
        colorClass = "text-red-600 dark:text-red-400";
    }

    return (
        <div className="flex items-start gap-3 p-2 border-b border-dashed">
            <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colorClass)} />
            <div className="flex-grow">
                <span className="font-semibold">{type}:</span>
                <span className="ml-2 text-muted-foreground">{message}</span>
            </div>
        </div>
    )
}

function DbInitForm() {
    const { t } = useLocale();
    const initialState: DbInitResult = { success: false, message: '', log: [] };
    
    const [state, formAction] = useActionState(initializeDatabase, initialState);

    return (
        <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader>
                <div className="flex justify-center pb-4">
                    <Logo />
                </div>
                <CardTitle className="text-center text-2xl">{t('dbInitializer.title')}</CardTitle>
                <CardDescription className="text-center">
                    {t('dbInitializer.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {state && state.log.length > 0 && (
                    <div className="space-y-4">
                        <Alert variant={state.success ? 'default' : 'destructive'} className={cn(state.success && "border-green-500/50 text-green-900 dark:border-green-500/30 dark:text-green-200 [&>svg]:text-green-600")}>
                            {state.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <AlertTitle>{state.success ? t('dbInitializer.successTitle') : t('toast.errorTitle')}</AlertTitle>
                            <AlertDescription>
                                {state.message}
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-lg border bg-muted/50">
                            <div className="flex items-center gap-2 p-3 border-b">
                                <Terminal className="h-5 w-5" />
                                <h3 className="font-semibold">{t('dbInitializer.logTitle')}</h3>
                            </div>
                            <ScrollArea className="h-60 p-2">
                                {state.log.map((line, index) => <LogEntry key={index} logLine={line} />)}
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button className="w-full">
                            <Database className="mr-2 h-4 w-4" />
                            {t('dbInitializer.button')}
                         </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <form action={formAction}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('dbInitializer.confirmationDescription')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <SubmitButton />
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </form>
                    </AlertDialogContent>
                </AlertDialog>
                 <Link href="/admin/login" className="text-sm text-muted-foreground hover:underline">
                    {t('dbInitializer.goBack')}
                </Link>
            </CardFooter>
        </Card>
    );
}


export default function DbInitPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <DbInitForm />
        </div>
    )
}
