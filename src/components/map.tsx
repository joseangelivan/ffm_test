
"use client";

import React from 'react';
import { Map, AdvancedMarker as GoogleAdvancedMarker } from '@vis.gl/react-google-maps';

export interface Marker {
    id: string;
    position: { lat: number; lng: number };
    label?: string;
    isActive?: boolean;
}

interface MapComponentProps {
    children?: React.ReactNode;
    defaultCenter?: { lat: number; lng: number; };
    markers?: Marker[];
    config: {
        apiKey: string;
        mapId?: string;
    }
    onMapLoad?: (map: google.maps.Map) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ children, defaultCenter, markers, config, onMapLoad }) => {
    
    return (
        <Map
            defaultCenter={defaultCenter}
            defaultZoom={15}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId={config.mapId}
            style={{ width: '100%', height: '100%' }}
            onLoad={e => onMapLoad && onMapLoad(e.map)}
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
