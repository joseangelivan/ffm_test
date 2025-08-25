

"use client";

import React, { useEffect } from 'react';
import { Map, AdvancedMarker as GoogleAdvancedMarker, useMap } from '@vis.gl/react-google-maps';

export interface Marker {
    id: string;
    position: { lat: number; lng: number };
    label?: string;
    isActive?: boolean;
}

interface MapProps {
    children?: React.ReactNode;
    center: { lat: number; lng: number; };
    markers?: Marker[];
    mapId?: string;
    onMapLoad?: (map: google.maps.Map) => void;
}

const MapInner: React.FC<Pick<MapProps, 'onMapLoad'>> = ({ onMapLoad }) => {
    const map = useMap();
    useEffect(() => {
        if (map && onMapLoad) {
            onMapLoad(map);
        }
    }, [map, onMapLoad]);
    return null;
};

const MapComponent: React.FC<MapProps> = ({ children, center, markers, mapId, onMapLoad }) => {
    return (
        <Map
            defaultCenter={center}
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
            {onMapLoad && <MapInner onMapLoad={onMapLoad} />}
            {children}
        </Map>
    );
};

export default MapComponent;
export const AdvancedMarker = GoogleAdvancedMarker;

    