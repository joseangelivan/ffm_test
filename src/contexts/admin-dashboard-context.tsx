
"use client";

import React from 'react';

export const AdminDashboardContext = React.createContext<{
    handleSetLocale: (locale: 'es' | 'pt-BR') => void,
    handleSetTheme: (theme: string) => void,
    theme: string,
    onAccountUpdateSuccess: (data: any) => void;
} | null>(null);
