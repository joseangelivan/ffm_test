
"use client";

import React from 'react';
import type { SessionPayload } from '@/lib/session';
import type { Condominio } from '@/actions/condos';

export const CondoDashboardContext = React.createContext<{
  session: SessionPayload;
  condo: Condominio | null;
  handleSetLocale: (locale: 'es' | 'pt-BR') => void;
  handleSetTheme: (theme: string) => void;
  theme: string;
} | null>(null);


export function useCondoDashboard() {
  const context = React.useContext(CondoDashboardContext);
  // This hook can be used in components that are ONLY ever rendered inside the CondoDashboard.
  // It will return null if not in context, so components need to handle that.
  return context;
}
