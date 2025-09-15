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

const GoogleMap = dynamic(() => import('./providers/google/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});


type MapContainerProps = {
    provider: DbMapProvider;
    onMapLoad: (map: OlMap, source: VectorSource) => void;
    dbGeofences: DbGeofence[];
    mode: 'view' | 'editing';
    showAllGeofences: boolean;
    selectedGeofenceId: string | null;
    defaultGeofenceId: string | null;
    initialPosition: { lat: number; lng: number };
    mapRef: React.RefObject<OlMap | null>;
    activeShapeState: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    shapeBeingSaved: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    children?: React.ReactNode;
}

const MapContainer: React.FC<MapContainerProps> = (props) => {
    const { t } = useLocale();
    const { provider } = props;

    // The map container logic is now primarily designed for OpenLayers,
    // which is our base for interactions. If we were to implement Google Maps
    // editing features, we would need a separate prop drill/state management
    // for its specific API (e.g., onMapLoad would need to be typed for both).
    // For now, we can render Google Maps in a view-only state if needed.

    switch (provider.provider_type) {
        case 'openlayers':
        case 'mapbox':
        case 'leaflet':
            return <OpenLayersMap {...props} />;
        
        case 'google':
             return (
                <div className="flex items-center justify-center h-full bg-muted relative">
                     <p className="absolute top-2 left-2 text-xs bg-background/80 p-2 rounded-md z-10">{t('adminDashboard.maps.providerNotSupported', { type: provider.provider_type })}</p>
                    <OpenLayersMap {...props} />
                </div>
            );

        default:
            return (
                 <div className="flex items-center justify-center h-full bg-muted">
                    <p>{t('adminDashboard.maps.providerNotSupported', { type: provider.provider_type })}</p>
                </div>
            );
    }
}

export default MapContainer;
