
"use client";

import React from 'react';
import type { Condominio } from '@/actions/condos';

export const CondoDashboardContext = React.createContext<{
  handleSetLocale: (locale: 'es' | 'pt-BR') => void;
  handleSetTheme: (theme: string) => void;
  theme: string;
  condo: Condominio | null;
  onDataNeedsRefresh: () => void;
} | null>(null);
