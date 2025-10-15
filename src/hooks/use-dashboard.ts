"use client";

import { useContext } from 'react';
import { AdminDashboardContext } from '@/contexts/admin-dashboard-context';
import { CondoDashboardContext } from '@/contexts/condo-dashboard-context';

export function useDashboard() {
    const adminContext = useContext(AdminDashboardContext);
    const condoContext = useContext(CondoDashboardContext);

    const context = adminContext || condoContext;

    if (!context) {
        // This might happen on pages without a dashboard context, which is acceptable
        // for components that can operate without it (like ThemeSwitcher).
        // Components that strictly require the context should handle the null case.
        return {
            handleSetLocale: () => console.warn("Dashboard context not found for setLocale"),
            handleSetTheme: () => console.warn("Dashboard context not found for setTheme"),
            theme: 'light',
            onAccountUpdateSuccess: () => console.warn("Dashboard context not found for onAccountUpdateSuccess"),
        };
    }
    
    // The properties are common to both contexts
    return context;
}
