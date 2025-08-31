

"use client";

import React, { useEffect } from 'react';
import { Map, AdvancedMarker as GoogleAdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { getDefaultMapProvider } from '@/actions/map_providers';

export interface Marker {
    id: string;
    position: { lat: number; lng: number };
    label?: string;
    isActive?: boolean;
}

interface MapProps {
    children?: React.ReactNode;
    defaultCenter?: { lat: number; lng: number; };
    markers?: Marker[];
    mapId?: string;
    onMapLoad?: (map: google.maps.Map) => void;
}

const MapComponent: React.FC<MapProps> = ({ children, defaultCenter, markers, mapId, onMapLoad }) => {
    const map = useMap();

    useEffect(() => {
        if (map && onMapLoad) {
            onMapLoad(map);
        }
    }, [map, onMapLoad]);

    return (
        <Map
            defaultCenter={defaultCenter}
            defaultZoom={15}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId={mapId}
            style={{ width: '100%', height: '100%' }}
        >
            {markers && markers.map(marker => (
                <GoogleAdvancedMarker
                    key={marker.id}
                    position={marker.position}
                    title={marker.label}
                />
            ))}
            {children}
        </Map>
    );
};

export default MapComponent;
export const AdvancedMarker = GoogleAdvancedMarker;
