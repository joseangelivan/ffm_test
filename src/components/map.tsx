
"use client";

import React, { useEffect, useRef } from 'react';
import { Map, AdvancedMarker as GoogleAdvancedMarker, useMap, APIProvider } from '@vis.gl/react-google-maps';

export interface Marker {
    id: string;
    position: { lat: number; lng: number };
    label?: string;
    isActive?: boolean;
}

interface MapProps {
    children?: React.ReactNode;
    onMapLoad?: (map: google.maps.Map) => void;
}

const MapComponent: React.FC<MapProps> = ({ children, onMapLoad }) => {
    const mapRef = useRef<google.maps.Map | null>(null);

    const handleCameraChanged = (ev: { map: google.maps.Map; }) => {
        if (onMapLoad && mapRef.current === null) {
            mapRef.current = ev.map;
            onMapLoad(ev.map);
        }
    };

    return (
        <Map
            defaultCenter={{ lat: -23.5505, lng: -46.6333 }}
            defaultZoom={4}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="follow-for-me-map"
            style={{ width: '100%', height: '100%' }}
            onCameraChanged={handleCameraChanged}
        >
            {children}
        </Map>
    );
};

export default MapComponent;
export const AdvancedMarker = GoogleAdvancedMarker;
