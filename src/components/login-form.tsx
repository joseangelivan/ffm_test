
'use client';

import React, { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Mail, Lock, Users, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Logo } from '@/components/logo';

import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n';

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
    <Button
      type="submit"
      className="w-full bg-accent hover:bg-accent/90"
      disabled={pending}
    >
      {t('login.loginButton')}
    </Button>
  );
}

function LoginFormContent({ formState }: { formState: any }) {
    const { pending } = useFormStatus();
    const { t } = useLocale();
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className={cn('relative transition-opacity', pending && 'opacity-50')}>
            {pending && <LoadingOverlay />}
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                <Logo />
                </div>
                <CardTitle className="font-headline text-3xl">
                {t('login.welcome')}
                </CardTitle>
                <CardDescription>{t('login.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="space-y-2">
                    <Label htmlFor="user-type">{t('login.userType')}</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Select
                          name="user_type"
                          defaultValue="gatekeeper"
                          disabled={pending}
                        >
                        <SelectTrigger id="user-type" className="pl-10">
                            <SelectValue placeholder={t('login.selectUserType')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="resident">
                                {t('login.resident')}
                            </SelectItem>
                            <SelectItem value="gatekeeper">
                                {t('login.gatekeeper')}
                            </SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="nombre@ejemplo.com"
                        className="pl-10"
                        autoComplete="email"
                        disabled={pending}
                        required
                        />
                    </div>
                    </div>
                    <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('login.password')}</Label>
                        <Link
                        href="#"
                        className={cn(
                            'text-sm text-accent-foreground hover:underline',
                            pending && 'pointer-events-none'
                        )}
                        aria-disabled={pending}
                        tabIndex={pending ? -1 : undefined}
                        >
                        {t('login.forgotPassword')}
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="current-password"
                        disabled={pending}
                        required
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
                    {formState?.success === false && formState.message && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                        <AlertDescription>{formState.message}</AlertDescription>
                    </Alert>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <SubmitButton />
            </CardFooter>
             <div className="px-6 pb-6 text-center text-sm">
                <Link
                href="/admin/login"
                className={cn(
                    'text-muted-foreground hover:text-primary hover:underline',
                    pending && 'pointer-events-none'
                )}
                aria-disabled={pending}
                tabIndex={pending ? -1 : undefined}
                >
                {t('login.adminLogin')}
                </Link>
            </div>
        </div>
    );
}

interface LoginFormProps {
    action: (prevState: any, formData: FormData) => Promise<any>;
}

export default function LoginForm({ action }: LoginFormProps) {
  const [state, formAction] = useActionState(action, undefined);
  
  return (
    <form action={formAction}>
        <LoginFormContent formState={state} />
    </form>
  );
}
