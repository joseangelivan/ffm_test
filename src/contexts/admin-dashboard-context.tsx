
"use client";

import React from 'react';
import type { SessionPayload } from '@/lib/session';

export const AdminDashboardContext = React.createContext<{
    handleSetLocale: (locale: 'es' | 'pt-BR') => void,
    handleSetTheme: (theme: string) => void,
    theme: string,
} | null>(null);

export function useAdminDashboard() {
    const context = React.useContext(AdminDashboardContext);
    if (!context) {
        throw new Error("useAdminDashboard must be used within an AdminDashboardProvider");
    }
    return context;
}
