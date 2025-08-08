
'use client';

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
import { Mail, AlertCircle, Loader } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { checkAdminEmail } from '@/actions/admin';

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
            {pending && <Loader className="h-4 w-4 animate-spin" />}
            {label}
        </Button>
    );
}

function LoginFormContent({ state }: { state: any }) {
    const { pending } = useFormStatus();
    const { t } = useLocale();
    const emailInputRef = useRef<HTMLInputElement>(null);
    const { locale } = useLocale();
    
    const getErrorMessage = (messageKey: string) => {
        const key = messageKey.replace('toast.adminLogin.', '');
        return t(`toast.adminLogin.${key}`) || "An unexpected error occurred.";
    }

    useEffect(() => {
        emailInputRef.current?.focus();
    }, []);

    return (
        <div className={cn("relative transition-opacity", pending && "opacity-50 pointer-events-none")}>
            {pending && <LoadingOverlay text={t('adminLogin.verifying')} />}
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <Logo />
              </div>
              <CardTitle className="font-headline text-3xl">{t('adminLogin.title')}</CardTitle>
              <CardDescription>
                {t('adminLogin.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <input type="hidden" name="locale" value={locale} />
                <div className="space-y-2">
                  <Label htmlFor="email">{t('adminLogin.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      ref={emailInputRef}
                      id="email"
                      name="email"
                      type="email"
                      placeholder="admin@ejemplo.com"
                      className="pl-10"
                      required
                      autoComplete="email"
                      disabled={pending}
                    />
                  </div>
                </div>
                
                {state?.success === false && state.message && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                      <AlertDescription variant="destructive">
                        {getErrorMessage(state.message)}
                      </AlertDescription>
                    </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-6 pb-6">
              <SubmitButton label={t('adminLogin.continueButton')} />
               <div className="text-center text-sm w-full">
                <Link
                  href="/"
                  className={cn("text-muted-foreground hover:text-primary hover:underline", pending && "pointer-events-none")}
                  aria-disabled={pending}
                  tabIndex={pending ? -1 : undefined}
                >
                  {t('adminLogin.returnToMainLogin')}
                </Link>
              </div>
            </CardFooter>
        </div>
    )
}

export default function AdminLoginForm() {
  const [state, formAction] = useActionState(checkAdminEmail, undefined);
  
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
        <div className="absolute top-4 right-4 flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
        </div>
      <Card className="w-full max-w-md shadow-2xl">
          <form action={formAction}>
              <LoginFormContent state={state} />
          </form>
      </Card>
    </div>
  );
}
