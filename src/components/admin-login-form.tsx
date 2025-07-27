
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
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';

interface AdminLoginFormProps {
    authenticateAdmin: (prevState: any, formData: FormData) => Promise<any>;
}

function LoadingOverlay() {
    const { t } = useLocale();
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{t('login.loggingIn')}</span>
            </div>
        </div>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pending}>
            {t('adminLogin.loginButton')}
        </Button>
    );
}

function LoginFormContent({ state }: { state: any }) {
    const { pending } = useFormStatus();
    const { t } = useLocale();
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay />}
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
                <div className="space-y-2">
                  <Label htmlFor="email">{t('adminLogin.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
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
                  <Label htmlFor="password">{t('adminLogin.password')}</Label>
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
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                  </div>
                </div>
                {state?.success === false && state.message && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Login Failed</AlertTitle>
                      <AlertDescription isCopyable={true}>
                        {state.message}
                      </AlertDescription>
                    </Alert>
                )}
                 {process.env.NODE_ENV === 'development' && state?.debugInfo && (
                  <div className="space-y-2 pt-4">
                      <Label htmlFor="debug-info">Debug Information</Label>
                       <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription isCopyable={true}>
                                {state.debugInfo}
                            </AlertDescription>
                        </Alert>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-6 pb-6">
              <SubmitButton />
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

export default function AdminLoginForm({ authenticateAdmin }: AdminLoginFormProps) {
  const [state, formAction] = useActionState(authenticateAdmin, undefined);

  return (
    <div className="light relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <LanguageSwitcher />
      <Card className="w-full max-w-md shadow-2xl">
          <form action={formAction}>
              <LoginFormContent state={state} />
          </form>
      </Card>
    </div>
  );
}
