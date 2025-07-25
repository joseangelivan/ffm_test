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
import { Mail, Lock } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useLocale } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useState } from 'react'; // Importar useState

export default function AdminLoginPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState(''); // Estado para el email
  const [password, setPassword] = useState(''); // Estado para la contraseña

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevenir el comportamiento por defecto del formulario
    console.log('Email:', email); // Imprimir email (temporal)
    console.log('Password:', password); // Imprimir password (temporal)

    // TODO: Implementar llamada a la API o Server Action para autenticación
    // Aquí es donde enviarías el email y la contraseña a tu backend para validarlos contra la BD.
    // Si la autenticación es exitosa, redirigir al dashboard.
  };

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
        <CardContent>
          {/* Envolver los campos en un form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('adminLogin.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@ejemplo.com"
                    className="pl-10"
                    value={email} // Vincular al estado
                    onChange={(e) => setEmail(e.target.value)} // Actualizar estado
                    required // Hacer campo requerido
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('adminLogin.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password} // Vincular al estado
                    onChange={(e) => setPassword(e.target.value)} // Actualizar estado
                    required // Hacer campo requerido
                  />
                </div>
              </div>
            </div>
             {/* Cambiar el Link a un Button submit */}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-6">
              {t('adminLogin.loginButton')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
           <div className="text-center text-sm w-full"> {/* w-full para centrar correctamente */}
            <Link
              href="/"
              className="text-muted-foreground hover:text-primary hover:underline"
            >
               {t('adminLogin.returnToMainLogin')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
