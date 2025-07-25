
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
import { Mail, Lock, Users } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd handle authentication here.
    // For now, just navigate to the dashboard.
    router.push('/dashboard');
  };

  return (
    <div className="light relative flex min-h-screen items-center justify-center bg-background px-4">
       <LanguageSwitcher />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">{t('login.welcome')}</CardTitle>
          <CardDescription>
            {t('login.description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                  <Label htmlFor="user-type">{t('login.userType')}</Label>
                   <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Select defaultValue="residente">
                      <SelectTrigger id="user-type" className="pl-10">
                          <SelectValue placeholder={t('login.selectUserType')} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="residente">{t('userTypes.residente')}</SelectItem>
                          <SelectItem value="porteria">{t('userTypes.portería')}</SelectItem>
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
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <Link
                    href="#"
                    className="text-sm text-accent-foreground hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
              {t('login.loginButton')}
            </Button>
          </CardFooter>
        </form>
         <div className="px-6 pb-6 text-center text-sm">
          <Link
            href="/admin/login"
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            {t('login.adminLogin')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
