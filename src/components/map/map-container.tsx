

"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

const OpenLayersMap = dynamic(() => import('./providers/openlayers/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});

type MapContainerProps = {
    children?: React.ReactNode;
    provider: DbMapProvider | null;
    onMapLoad?: (map: any) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ children, provider, onMapLoad = () => {} }) => {
    const { t } = useLocale();

    if (!provider) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <p>{t('adminDashboard.maps.noServices')}</p>
            </div>
        );
    }
    
    // For now, we only support openlayers. We can add a switch here for other providers.
    switch (provider.provider_type) {
        case 'openlayers':
        case 'google': // Let's route google type to openlayers for now
        case 'mapbox': // Let's route mapbox type to openlayers for now
        case 'leaflet': // Let's route leaflet type to openlayers for now
            return <OpenLayersMap provider={provider} onMapLoad={onMapLoad}>{children}</OpenLayersMap>;
        default:
            return (
                 <div className="flex items-center justify-center h-full bg-muted">
                    <p>{t('adminDashboard.maps.providerNotSupported', { type: provider.provider_type })}</p>
                </div>
            );
    }
}

export default MapContainer;

    