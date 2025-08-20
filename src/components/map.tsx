
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
    center: { lat: number; lng: number } | null;
    markers?: Marker[];
    zoom?: number;
    children?: React.ReactNode;
    onMapLoad?: (map: google.maps.Map) => void;
}

const BoundsUpdater = ({ markers }: { markers?: Marker[] }) => {
    const map = useMap();
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!map || !markers || markers.length === 0 || !isFirstLoad.current) return;

        if (markers.length === 1) {
            map.setCenter(markers[0].position);
            map.setZoom(15);
        } else {
            const bounds = new window.google.maps.LatLngBounds();
            markers.forEach(marker => {
                bounds.extend(marker.position);
            });
            map.fitBounds(bounds);
        }
        
        isFirstLoad.current = false; // Mark initial load as complete

    }, [map, markers]);

    return null;
};

const MapComponent: React.FC<MapProps> = ({ center, markers, zoom = 12, children, onMapLoad }) => {
    const mapRef = useRef<google.maps.Map | null>(null);

    const handleMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
        if (onMapLoad) {
            onMapLoad(map);
        }
    };
    
    if (!center) {
        return null;
    }

    return (
        <Map
            center={center}
            defaultZoom={zoom}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="follow-for-me-map"
            style={{ width: '100%', height: '100%' }}
            onCameraChanged={(ev) => handleMapLoad(ev.map)}
        >
            {markers?.map((marker) => (
                <GoogleAdvancedMarker key={marker.id} position={marker.position} title={marker.label}>
                     <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center
                        transition-all duration-300 ease-in-out
                        ${marker.isActive 
                            ? 'bg-blue-500 ring-4 ring-blue-300' 
                            : 'bg-gray-500 ring-2 ring-gray-300'
                        }
                     `}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                     </div>
                </GoogleAdvancedMarker>
            ))}
            {markers && markers.length > 0 && <BoundsUpdater markers={markers} />}
            {children}
        </Map>
    );
};

export default MapComponent;
export const AdvancedMarker = GoogleAdvancedMarker;
