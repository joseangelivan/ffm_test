

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
    provider: DbMapProvider;
    onMapLoad: (map: any, source: any) => void;
    children?: React.ReactNode;
}

const MapContainer: React.FC<MapContainerProps> = (props) => {
    const { t } = useLocale();
    const { provider } = props;

    switch (provider.provider_type) {
        case 'openlayers':
        case 'google': // Temporarily routing to OpenLayers
        case 'mapbox': // Temporarily routing to OpenLayers
        case 'leaflet': // Temporarily routing to OpenLayers
            return <OpenLayersMap {...props} />;
        default:
            return (
                 <div className="flex items-center justify-center h-full bg-muted">
                    <p>{t('adminDashboard.maps.providerNotSupported', { type: provider.provider_type })}</p>
                </div>
            );
    }
}

export default MapContainer;
