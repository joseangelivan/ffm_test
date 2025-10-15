
"use client";

import React, { useContext } from 'react';
import type { Condominio } from '@/actions/condos';
import type { MapProvider } from '@/actions/map_providers';

export const CondoDashboardContext = React.createContext<{
  handleSetLocale: (locale: 'es' | 'pt-BR') => void;
  handleSetTheme: (theme: string) => void;
  theme: string;
  condo: (Condominio & { geofences: any[] }) | null;
  onDataNeedsRefresh: () => void;
  mapProvider: MapProvider | null;
  refreshMapProvider: () => Promise<void>;
  onSearchAddress: (coords: { lat: number, lng: number }) => void;
  onAccountUpdateSuccess: (data: any) => void;
} | null>(null);


export function useCondoDashboard() {
    const context = useContext(CondoDashboardContext);
    if (!context) {
        throw new Error("useCondoDashboard must be used within a CondoDashboardProvider");
    }
    return context;
}
