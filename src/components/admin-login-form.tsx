
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
import { Mail, Lock, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import { useActionState, useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { useRouter } from 'next/navigation';

type Translations = {
    title: string;
    description: string;
    emailLabel: string;
    passwordLabel: string;
    loginButton: string;
    returnToMainLogin: string;
    loggingIn: string;
    errorTitle: string;
    showPassword; string;
    hidePassword; string;
}

type ErrorKeys = {
    invalidCredentials: string;
    missingCredentials: string;
    sessionError: string;
    serverError: string;
}

interface AdminLoginFormProps {
    authenticateAdmin: (prevState: any, formData: FormData) => Promise<any>;
    t: Translations;
    tErrorKeys: ErrorKeys;
}

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

function LoginFormContent({ state, t, tErrorKeys }: { state: any, t: Translations, tErrorKeys: ErrorKeys }) {
    const { pending } = useFormStatus();
    const [showPassword, setShowPassword] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const { locale } = useLocale();
    
    // Function to get the correct translated error message
    const getErrorMessage = (messageKey: string) => {
        const key = messageKey.replace('toast.adminLogin.', '');
        return tErrorKeys[key as keyof ErrorKeys] || "An unexpected error occurred.";
    }

    useEffect(() => {
        emailInputRef.current?.focus();
    }, []);

    return (
        <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={t.loggingIn} />}
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <Logo />
              </div>
              <CardTitle className="font-headline text-3xl">{t.title}</CardTitle>
              <CardDescription>
                {t.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <input type="hidden" name="locale" value={locale} />
                <div className="space-y-2">
                  <Label htmlFor="email">{t.emailLabel}</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="password">{t.passwordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
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
                        aria-label={showPassword ? t.hidePassword : t.showPassword}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                  </div>
                </div>
                {state?.success === false && state.message && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t.errorTitle}</AlertTitle>
                      <AlertDescription variant="destructive">
                        {getErrorMessage(state.message)}
                      </AlertDescription>
                    </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-6 pb-6">
              <SubmitButton label={t.loginButton} />
              <div className="text-center text-sm w-full">
                <Link
                  href="/"
                  className={cn("text-muted-foreground hover:text-primary hover:underline", pending && "pointer-events-none")}
                  aria-disabled={pending}
                  tabIndex={pending ? -1 : undefined}
                >
                  {t.returnToMainLogin}
                </Link>
              </div>
            </CardFooter>
        </div>
    )
}

export default function AdminLoginForm({ authenticateAdmin, t, tErrorKeys }: AdminLoginFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(authenticateAdmin, undefined);
  
  useEffect(() => {
    if (state?.success === true) {
      router.push('/admin/dashboard');
    }
  }, [state, router]);


  return (
    <div className="light relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <LanguageSwitcher />
      <Card className="w-full max-w-md shadow-2xl">
          <form action={formAction}>
              <LoginFormContent state={state} t={t} tErrorKeys={tErrorKeys} />
          </form>
      </Card>
    </div>
  );
}
