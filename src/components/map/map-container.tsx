

"use client";

import React from 'react';
import type { Map as OlMap } from 'ol';
import type VectorSource from 'ol/source/Vector';
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
    const { provider } = props;

    if (!provider) {
        return <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>;
    }
    
    if (provider.provider_type === 'google') {
        return <GoogleMap {...props} initialPosition={props.initialMapConfig?.center} />;
    }
    
    // For 'openlayers', 'leaflet', 'mapbox'
    return <OpenLayersMap {...props} />;
}

export default MapContainer;
