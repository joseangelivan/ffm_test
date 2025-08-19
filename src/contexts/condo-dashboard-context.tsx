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