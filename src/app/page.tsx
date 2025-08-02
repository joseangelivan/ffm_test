
'use client';

import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import LoginForm from '@/components/login-form';
import { authenticateUser } from '@/actions/user';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md shadow-2xl">
        <LoginForm action={authenticateUser} />
      </Card>
    </div>
  );
}
