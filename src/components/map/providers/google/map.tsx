"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

interface GoogleMapProps {
    provider: DbMapProvider;
    initialPosition?: { lat: number, lng: number };
}

const loadGoogleMapsApi = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-maps-api')) {
      if ((window as any).google && (window as any).google.maps) {
        resolve();
      } else {
        // If script is there but window.google is not, wait for it
        const intervalId = setInterval(() => {
          if ((window as any).google && (window as any).google.maps) {
            clearInterval(intervalId);
            resolve();
          }
        }, 100);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });
};


const GoogleMap: React.FC<GoogleMapProps> = ({ provider, initialPosition = { lat: -14.235, lng: -51.9253 } }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const apiKey = provider.config_json?.api_config?.parameters?.apiKey;

        if (!apiKey) {
            setError("Google Maps API key is missing.");
            setIsLoading(false);
            return;
        }

        loadGoogleMapsApi(apiKey)
            .then(() => {
                if (mapRef.current) {
                    new (window as any).google.maps.Map(mapRef.current, {
                        center: initialPosition,
                        zoom: 15,
                        mapId: provider.config_json?.api_config?.parameters?.mapId || 'roadmap',
                    });
                    setIsLoading(false);
                }
            })
            .catch((e) => {
                console.error(e);
                setError(e.message);
                setIsLoading(false);
            });
            
    }, [provider, initialPosition]);

    return (
        <div className="w-full h-full relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Loader className="h-6 w-6 animate-spin" />
                </div>
            )}
             {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive p-4">
                    <p>{error}</p>
                </div>
            )}
            <div ref={mapRef} className="w-full h-full" style={{ visibility: isLoading || error ? 'hidden' : 'visible' }} />
        </div>
    );
};

export default GoogleMap;
