
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
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AdminLoginFormProps {
    authenticateAdmin: (prevState: { message: string } | undefined, formData: FormData) => Promise<{ success: boolean; message: string }>;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pending}>
            {pending ? t('login.loggingIn') : t('adminLogin.loginButton')}
        </Button>
    )
}


export default function AdminLoginForm({ authenticateAdmin }: AdminLoginFormProps) {
  const { t } = useLocale();
  const [state, formAction] = useFormState(authenticateAdmin, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success === false && state.message) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: state.message,
        })
    }
  }, [state, toast]);


  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <LanguageSwitcher />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">{t('adminLogin.title')}</CardTitle>
          <CardDescription>
            {t('adminLogin.description')}
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
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
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            {state?.success === false && state.message && (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {state.message}
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-6 pb-6">
            <SubmitButton />
            <div className="text-center text-sm w-full">
              <Link
                href="/"
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                {t('adminLogin.returnToMainLogin')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
