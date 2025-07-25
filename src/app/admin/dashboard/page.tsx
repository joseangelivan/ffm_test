"use client";

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/actions/auth';
import AdminDashboardClient from '@/components/admin-dashboard-client';

type Session = {
    id: string;
    email: string;
    name: string;
}

export default function AdminDashboardPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    async function checkSession() {
      const sessionData = await getSession();
      setSession(sessionData);
      if (!sessionData) {
        redirect('/admin/login');
      }
    }
    checkSession();
  }, []);

  if (session === undefined) {
    // Puedes mostrar un skeleton/loader aquí mientras se verifica la sesión
    return <div>Loading...</div>;
  }

  if (session === null) {
    // La redirección ya se habrá iniciado, pero esto evita renderizar el resto
    return null;
  }
  
  return <AdminDashboardClient session={session} />;
}
