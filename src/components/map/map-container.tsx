

"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import type { Geofence as DbGeofence } from '@/actions/maps';
import type { Map as OlMap, Feature } from 'ol';
import type { Vector as VectorSource } from 'ol/source';

const OpenLayersMap = dynamic(() => import('./providers/openlayers/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});


type MapContainerProps = {
    provider: DbMapProvider;
    onMapLoad: (map: OlMap | any, source?: VectorSource) => void;
    dbGeofences?: DbGeofence[];
    mode?: 'view' | 'editing';
    showAllGeofences?: boolean;
    selectedGeofenceId?: string | null;
    defaultGeofenceId?: string | null;
    initialPosition?: { lat: number; lng: number };
    activeShapeState?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    shapeBeingSaved?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    googleMapsApiKey?: string;
    children?: React.ReactNode;
}

const MapContainer: React.FC<MapContainerProps> = (props) => {
    const { t } = useLocale();
    
    // OpenLayers is now the single entry point for all map types.
    return <OpenLayersMap {...props} />;
}

export default MapContainer;
