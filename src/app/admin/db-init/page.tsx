
"use client";

import React, { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Database, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { initializeDatabase } from '@/lib/db';
import { useLocale } from '@/lib/i18n';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
        <AlertDialogTrigger asChild>
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
        </AlertDialogTrigger>
    );
}


function DbInitForm() {
    const { t } = useLocale();
    
    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await initializeDatabase();
        if (result.success) {
            return { success: true, message: t('dbInitializer.successDescription') };
        }
        return { success: false, message: result.message };
    };
    
    const [state, formAction] = useActionState(handleAction, undefined);

    return (
        <Card className="w-full max-w-lg shadow-xl">
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
                {state?.message && (
                    <Alert variant={state.success ? 'default' : 'destructive'} className={cn(state.success && "border-green-500/50 text-green-900 dark:border-green-500/30 dark:text-green-200 [&>svg]:text-green-600")}>
                        {state.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>{state.success ? t('dbInitializer.successTitle') : t('toast.errorTitle')}</AlertTitle>
                        <AlertDescription>
                            {state.message}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <form action={formAction} className="w-full">
                    <AlertDialog>
                        <SubmitButton />
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('dbInitializer.confirmationDescription')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction type="submit" className={buttonVariants({ variant: 'destructive' })}>
                                     {t('dbInitializer.confirmButton')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </form>
                 <Link href="/admin/login" className="text-sm text-muted-foreground hover:underline">
                    {t('firstLogin.backToLogin')}
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