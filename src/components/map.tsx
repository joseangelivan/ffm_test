
"use client";

import React, { useEffect } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker as GoogleAdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useLocale } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export interface Marker {
    id: string;
    position: { lat: number; lng: number };
    label?: string;
    isActive?: boolean;
}

interface MapProps {
    children?: React.ReactNode;
    center: { lat: number; lng: number; };
    markers: Marker[];
    onMapLoad?: (map: google.maps.Map) => void;
}

const MapInner: React.FC<MapProps> = ({ children, markers, onMapLoad }) => {
    const map = useMap();

    useEffect(() => {
        if (map && onMapLoad) {
            onMapLoad(map);
        }
    }, [map, onMapLoad]);

    return (
        <>
            {markers.map(marker => (
                <GoogleAdvancedMarker
                    key={marker.id}
                    position={marker.position}
                    title={marker.label}
                />
            ))}
            {children}
        </>
    );
};


const MapComponent: React.FC<MapProps> = ({ children, center, markers, onMapLoad }) => {
    return (
        <GoogleMap
            defaultCenter={center}
            defaultZoom={15}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="follow-for-me-map"
            style={{ width: '100%', height: '100%' }}
        >
           <MapInner onMapLoad={onMapLoad} markers={markers}>
             {children}
           </MapInner>
        </GoogleMap>
    );
};


const MapContainer: React.FC<MapProps> = ({ children, center, markers, onMapLoad }) => {
    const { t } = useLocale();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
         return (
            <div className="flex items-center justify-center h-full bg-muted">
                <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('condoDashboard.map.apiKeyMissing.title')}</AlertTitle>
                    <AlertDescription>
                        {t('condoDashboard.map.apiKeyMissing.description')}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <APIProvider apiKey={apiKey} libraries={['drawing', 'geocoding']}>
            <MapComponent center={center} markers={markers} onMapLoad={onMapLoad}>
              {children}
            </MapComponent>
        </APIProvider>
    );
}


export default MapContainer;
export const AdvancedMarker = GoogleAdvancedMarker;
