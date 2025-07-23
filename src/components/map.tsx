
"use client";

import React, { useEffect } from 'react';
import { Map, AdvancedMarker, useMap, APIProvider } from '@vis.gl/react-google-maps';

export interface Marker {
    id: string;
    position: { lat: number; lng: number };
    label?: string;
    isActive?: boolean;
}

interface MapProps {
    center: { lat: number; lng: number };
    markers?: Marker[];
    zoom?: number;
    children?: React.ReactNode;
}

const BoundsUpdater = ({ markers }: { markers?: Marker[] }) => {
    const map = useMap();
  
    useEffect(() => {
      if (!map || !markers || markers.length === 0) return;
  
      if (markers.length === 1) {
        map.setCenter(markers[0].position);
        map.setZoom(15); 
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend(marker.position);
      });
      map.fitBounds(bounds);

      const listener = map.addListener('idle', () => {
        if (map.getZoom()! > 16) map.setZoom(16);
      });
  
      return () => {
        window.google.maps.event.removeListener(listener);
      }
    }, [map, markers]);
  
    return null;
  };

const MapComponent: React.FC<MapProps> = ({ center, markers, zoom = 12, children }) => {
    return (
        <Map
            defaultCenter={center}
            defaultZoom={zoom}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="follow-for-me-map"
            style={{ width: '100%', height: '100%' }}
        >
            {markers?.map((marker) => (
                <AdvancedMarker key={marker.id} position={marker.position} title={marker.label}>
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
                </AdvancedMarker>
            ))}
            {markers && markers.length > 0 && <BoundsUpdater markers={markers} />}
            {children}
        </Map>
    );
};

export default MapComponent;
