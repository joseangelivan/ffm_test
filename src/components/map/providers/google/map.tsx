
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import 'ol/ol.css'; // Although not OpenLayers, it can provide some useful base CSS.

interface MapProps {
    provider: DbMapProvider;
    googleMapsApiKey?: string;
    initialPosition?: { lat: number; lng: number };
}

declare global {
  interface Window {
    google?: any;
    __googleMapsApiLoadedCallback?: () => void;
  }
}

const GoogleMap: React.FC<MapProps> = ({
    provider,
    googleMapsApiKey,
    initialPosition = { lat: -14.235, lng: -51.9253 }, // Default to Brazil
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [isApiLoaded, setIsApiLoaded] = useState(false);

    const loadGoogleMapsApi = useCallback((apiKey: string) => {
        return new Promise<void>((resolve, reject) => {
            if (window.google && window.google.maps) {
                resolve();
                return;
            }

            if (document.getElementById('google-maps-api-script')) {
                 window.__googleMapsApiLoadedCallback = () => resolve();
                return;
            }

            window.__googleMapsApiLoadedCallback = () => resolve();

            const script = document.createElement('script');
            script.id = 'google-maps-api-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsApiLoadedCallback`;
            script.async = true;
            script.defer = true;
            script.onerror = () => reject(new Error("Google Maps script failed to load."));
            document.head.appendChild(script);
        });
    }, []);

    useEffect(() => {
        const config = provider.config_json || {};
        const apiConfig = config.api_config || {};
        const apiKey = apiConfig.parameters?.apiKey || googleMapsApiKey;

        if (!apiKey) {
            console.error("Google Maps API key is missing.");
            return;
        }

        loadGoogleMapsApi(apiKey)
            .then(() => setIsApiLoaded(true))
            .catch(err => console.error(err));
        
        // Cleanup function for when the component unmounts
        return () => {
            const script = document.getElementById('google-maps-api-script');
            if (script) {
                // It's generally better to leave the script loaded,
                // but nullify the callback to prevent memory leaks.
                window.__googleMapsApiLoadedCallback = undefined;
            }
        };

    }, [provider, googleMapsApiKey, loadGoogleMapsApi]);

    useEffect(() => {
        if (isApiLoaded && mapContainerRef.current && !mapInstanceRef.current) {
             const config = provider.config_json || {};
             const apiConfig = config.api_config || {};

            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: initialPosition,
                zoom: 15,
                mapId: apiConfig.parameters?.mapId,
                disableDefaultUI: true,
            });
            mapInstanceRef.current = map;
        }
    }, [isApiLoaded, initialPosition, provider.config_json]);

    return (
        <div ref={mapContainerRef} className="w-full h-full" />
    );
};

export default GoogleMap;
