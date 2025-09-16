

"use client";

import React, { Suspense } from 'react';
import type { Map } from 'ol';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

// Carga dinámica de los componentes de mapa específicos del proveedor
const OpenLayersMap = dynamic(() => import('./providers/openlayers/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});

const GoogleMap = dynamic(() => import('@/components/condo/map/providers/google/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});

const MapContainer: React.FC<any> = (props) => {
    const { provider, mapRef } = props;

    if (!provider) {
        return <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>;
    }

    // For simplicity, we assume Google Maps needs its own component and everything else uses OpenLayers.
    if (provider.provider_type === 'google') {
        return <GoogleMap {...props} />;
    }
    
    // For 'openlayers', 'leaflet', 'mapbox'
    return <OpenLayersMap {...props} />;
}

export default MapContainer;
