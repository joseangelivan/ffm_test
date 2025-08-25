
"use client";

import React from 'react';
import { Map, AdvancedMarker as GoogleAdvancedMarker } from '@vis.gl/react-google-maps';

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

const MapComponent: React.FC<MapProps> = ({ children, center, markers, onMapLoad }) => {
    return (
        <Map
            defaultCenter={center}
            defaultZoom={15}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="follow-for-me-map"
            style={{ width: '100%', height: '100%' }}
            onCameraChanged={ev => onMapLoad && onMapLoad(ev.map)}
        >
            {markers.map(marker => (
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
