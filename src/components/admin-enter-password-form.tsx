
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
import { Lock, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import { useActionState, useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { authenticateAdmin } from '@/actions/auth';

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

function EnterPasswordFormContent({ email, state }: { email: string, state: any }) {
    const { pending } = useFormStatus();
    const { t } = useLocale();
    const [showPassword, setShowPassword] = useState(false);
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const { locale } = useLocale();
    
    const getErrorMessage = (messageKey: string) => {
        const key = messageKey.replace('toast.adminLogin.', '');
        return t(`toast.adminLogin.${key}`) || "An unexpected error occurred.";
    }

    useEffect(() => {
        passwordInputRef.current?.focus();
    }, []);

    return (
        <div className={cn("relative transition-opacity", pending && "opacity-50 pointer-events-none")}>
            {pending && <LoadingOverlay text={t('login.loggingIn')} />}
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                    <Logo />
                </div>
                <CardTitle className="font-headline text-3xl">{t('login.welcome')}</CardTitle>
                <CardDescription>
                    {t('adminLogin.enterPasswordDescription', { email })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Accessibility fix: Add an invisible username field for password managers */}
                    <input type="text" name="username" defaultValue={email} autoComplete="username" className="hidden" />
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="locale" value={locale} />
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('login.password')}</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                ref={passwordInputRef}
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10"
                                required
                                autoComplete="current-password"
                                disabled={pending}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent"
                                onClick={() => setShowPassword(prev => !prev)}
                                disabled={pending}
                                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
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
                <SubmitButton label={t('login.loginButton')} />
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

export function AdminEnterPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(authenticateAdmin, undefined);
  
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
        <div className="absolute top-4 right-4 flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
        </div>
      <Card className="w-full max-w-md shadow-2xl">
          <form action={formAction}>
              <EnterPasswordFormContent email={email} state={state} />
          </form>
      </Card>
    </div>
  );
}
