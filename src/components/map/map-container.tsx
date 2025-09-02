

"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import type { Geofence as DbGeofence } from '@/actions/maps';
import type Feature from 'ol/Feature';
import type { Map as OlMap } from 'ol';
import type { Vector as VectorSource } from 'ol/source';

const OpenLayersMap = dynamic(() => import('./providers/openlayers/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});

type MapContainerProps = {
    provider: DbMapProvider | null;
    onMapLoad: (map: OlMap, source: VectorSource) => void;
    dbGeofences: DbGeofence[];
    activeShapeState: { id: string, feature: Feature | null } | null;
    showAllGeofences: boolean;
    selectedGeofenceId: string | null;
    defaultGeofenceId: string | null;
    mode: 'view' | 'editing';
    initialPosition: { lat: number, lng: number };
    mapRef: React.MutableRefObject<OlMap | null>;
}

const MapContainer: React.FC<MapContainerProps> = (props) => {
    const { t } = useLocale();
    const { provider } = props;

    if (!provider) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <p>{t('adminDashboard.maps.noServices')}</p>
            </div>
        );
    }
    
    switch (provider.provider_type) {
        case 'openlayers':
        case 'google':
        case 'mapbox':
        case 'leaflet':
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
