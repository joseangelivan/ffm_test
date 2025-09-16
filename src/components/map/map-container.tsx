"use client";

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import type { Geofence as DbGeofence } from '@/actions/maps';
import type { Map as OlMap, Feature } from 'ol';
import type { Vector as VectorSource } from 'ol/source';

const OpenLayersMap = dynamic(() => import('./providers/openlayers/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});

const GoogleMap = dynamic(() => import('./providers/google/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});


type MapContainerProps = {
    provider: DbMapProvider | null;
    mapRef?: React.RefObject<OlMap | null>;
    onMapLoad?: (map: OlMap | any, source?: VectorSource) => void;
    googleMapsApiKey?: string;
    dbGeofences?: DbGeofence[];
    mode?: 'view' | 'editing';
    showAllGeofences?: boolean;
    selectedGeofenceId?: string | null;
    defaultGeofenceId?: string | null;
    initialPosition?: { lat: number; lng: number };
    activeShapeState?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    shapeBeingSaved?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    children?: React.ReactNode;
}

const MapContainer: React.FC<MapContainerProps> = (props) => {
    const { provider } = props;
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (provider) {
            setIsLoading(false);
        }
    }, [provider]);

    if (isLoading || !provider) {
        return <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>;
    }

    if (provider.provider_type === 'google') {
        return <GoogleMap {...props} />;
    }
    
    return <OpenLayersMap {...props} />;
}

export default MapContainer;
