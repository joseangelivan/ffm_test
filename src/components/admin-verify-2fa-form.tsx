
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertCircle, Loader } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { verifyTotp } from '@/actions/auth';

function LoadingOverlay({ text }: { text: string }) {
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{text}</span>
            </div>
        </div>
    );
}

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pending}>
            {label}
        </Button>
    );
}

function Verify2faFormContent({ email, state }: { email: string, state: any }) {
    const { pending } = useFormStatus();
    const { t } = useLocale();
    const tokenInputRef = useRef<HTMLInputElement>(null);
    const { locale } = useLocale();
    
    useEffect(() => {
        tokenInputRef.current?.focus();
    }, []);

    return (
        <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={t('adminLogin.verifying')} />}
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                    <Logo />
                </div>
                <CardTitle className="font-headline text-3xl">{t('adminLogin.twoFactorAuth.title')}</CardTitle>
                <CardDescription>
                    {t('adminLogin.twoFactorAuth.description')}
                </CardDescription>
                 <div className="text-sm font-semibold p-2 bg-muted rounded-md">{email}</div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="locale" value={locale} />
                    <div className="space-y-2">
                        <Label htmlFor="token">{t('adminLogin.twoFactorAuth.codeLabel')}</Label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                ref={tokenInputRef}
                                id="token"
                                name="token"
                                type="text"
                                placeholder="123456"
                                className="pl-10 text-center tracking-[0.5em]"
                                required
                                maxLength={6}
                                pattern="\d{6}"
                                autoComplete="one-time-code"
                                disabled={pending}
                            />
                        </div>
                    </div>
                    {state?.success === false && state.message && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                            <AlertDescription variant="destructive">
                                {state.message}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-6 pb-6">
                <SubmitButton label={t('adminLogin.twoFactorAuth.verifyButton')} />
                <div className="text-center text-sm w-full">
                    <Link
                        href="/admin/login"
                        className={cn("text-muted-foreground hover:text-primary hover:underline", pending && "pointer-events-none")}
                        aria-disabled={pending}
                        tabIndex={pending ? -1 : undefined}
                    >
                       {t('adminLogin.wrongEmail')}
                    </Link>
                </div>
            </CardFooter>
        </div>
    );
}

export function AdminVerify2faForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(verifyTotp, undefined);
  
  return (
    <div className="light relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <LanguageSwitcher />
      <Card className="w-full max-w-md shadow-2xl">
          <form action={formAction}>
              <Verify2faFormContent email={email} state={state} />
          </form>
      </Card>
    </div>
  );
}
