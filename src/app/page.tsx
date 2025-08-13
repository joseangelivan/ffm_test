
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import LoginForm from '@/components/login-form';
import { authenticateUser } from '@/actions/user';
import Loading from './loading';

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <Loading />;
  }

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
