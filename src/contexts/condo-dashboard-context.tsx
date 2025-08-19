
"use client";

import React from 'react';
import type { SessionPayload } from '@/lib/session';
import type { Condominio } from '@/actions/condos';

export const CondoDashboardContext = React.createContext<{
  handleSetLocale: (locale: 'es' | 'pt-BR') => void;
  handleSetTheme: (theme: string) => void;
  theme: string;
  condo: Condominio | null;
} | null>(null);


export function useCondoDashboard() {
  const context = React.useContext(CondoDashboardContext);
  if (!context) {
    throw new Error("useCondoDashboard must be used within a CondoDashboardProvider");
  }
  return context;
}
