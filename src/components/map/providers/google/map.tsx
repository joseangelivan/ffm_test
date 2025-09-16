"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import { Loader } from 'lucide-react';
import type { Geofence as DbGeofence } from '@/actions/maps';
import type { Feature } from 'ol';

interface MapProps {
    provider: DbMapProvider | null;
    googleMapsApiKey?: string;
    initialPosition?: { lat: number; lng: number };
    dbGeofences?: DbGeofence[];
    mode?: 'view' | 'editing';
    showAllGeofences?: boolean;
    selectedGeofenceId?: string | null;
    defaultGeofenceId?: string | null;
    activeShapeState?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
}

declare global {
  interface Window {
    google?: any;
    __googleMapsApiLoadedCallback?: () => void;
  }
}

const loadGoogleMapsApi = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-maps-api-script');
    if (existingScript) {
      if ((window as any).__googleMapsApiLoading__) {
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      } else {
        resolve();
      }
      return;
    }

    (window as any).__googleMapsApiLoading__ = true;

    window.__googleMapsApiLoadedCallback = () => {
      (window as any).__googleMapsApiLoading__ = false;
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'google-maps-api-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsApiLoadedCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        (window as any).__googleMapsApiLoading__ = false;
        reject(new Error("Google Maps script failed to load."));
    };
    document.head.appendChild(script);
  });
};


const GoogleMap: React.FC<MapProps> = ({
    provider,
    googleMapsApiKey,
    initialPosition = { lat: -14.235, lng: -51.9253 }, // Default to Brazil
    dbGeofences = [],
    mode,
    showAllGeofences,
    selectedGeofenceId,
    defaultGeofenceId,
    activeShapeState,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const config = provider?.config_json || {};
        const apiConfig = config.api_config || {};
        const apiKey = apiConfig.parameters?.apiKey || googleMapsApiKey;

        if (!apiKey) {
            console.error("Google Maps API key is missing.");
            setIsLoading(false);
            return;
        }

        loadGoogleMapsApi(apiKey)
            .then(() => {
                if (mapContainerRef.current && !mapInstanceRef.current) {
                    const map = new window.google.maps.Map(mapContainerRef.current, {
                        center: initialPosition,
                        zoom: 15,
                        mapId: apiConfig.parameters?.mapId,
                        disableDefaultUI: true,
                    });
                    mapInstanceRef.current = map;
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoading(false);
            });
        
    }, [provider, googleMapsApiKey, initialPosition]);


    if (isLoading) {
        return <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>;
    }

    return (
        <div ref={mapContainerRef} className="w-full h-full" />
    );
};

export default GoogleMap;
