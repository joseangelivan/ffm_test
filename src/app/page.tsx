
'use client';

import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import LoginForm from '@/components/login-form';
import { authenticateUser } from '@/actions/user';

export default function LoginPage() {
  return (
    <div className="light relative flex min-h-screen items-center justify-center bg-background px-4">
      <LanguageSwitcher />
      <Card className="w-full max-w-md shadow-2xl">
        <LoginForm action={authenticateUser} />
      </Card>
    </div>
  );
}
