
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

// --- LÓGICA DE CARGA DE API DE GOOGLE ---
declare global {
  interface Window {
    __googleMapsApiPromise__: Promise<void>;
    __googleMapsApiLoading__: boolean;
  }
}

const loadGoogleMapsApi = (apiKey: string): Promise<void> => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error("Cannot load Google Maps API in SSR."));
    }
    if (window.google?.maps) {
        return Promise.resolve();
    }
    if (window.__googleMapsApiPromise__) {
        return window.__googleMapsApiPromise__;
    }

    window.__googleMapsApiLoading__ = true;
    window.__googleMapsApiPromise__ = new Promise<void>((resolve, reject) => {
        (window as any).initGoogleMapsApi = () => {
            window.__googleMapsApiLoading__ = false;
            resolve();
            delete (window as any).initGoogleMapsApi;
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApi`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            window.__googleMapsApiLoading__ = false;
            reject(new Error("Failed to load Google Maps script."));
            delete (window as any).initGoogleMapsApi;
        };
        document.head.appendChild(script);
    });

    return window.__googleMapsApiPromise__;
};

// --- TIPOS Y COMPONENTE PRINCIPAL ---
interface GoogleMapProps {
    provider: DbMapProvider;
    initialPosition?: { lat: number; lng: number };
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
    provider, 
    initialPosition = { lat: -14.235, lng: -51.9253 } 
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [isApiReady, setIsApiReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const apiKey = provider.config_json?.api_config?.parameters?.apiKey;
        if (apiKey) {
            loadGoogleMapsApi(apiKey)
                .then(() => { if (isMounted) setIsApiReady(true); })
                .catch(err => {
                    console.error("Google Maps API failed to load:", err);
                    if (isMounted) setError("Failed to load Google Maps API. Please check your API key and network connection.");
                });
        } else {
            setError("Google Maps API Key is missing in the provider configuration.");
        }
        return () => { isMounted = false; };
    }, [provider]);

    useEffect(() => {
        if (!isApiReady || !mapContainerRef.current) {
            return;
        }

        const mapInstance = new window.google.maps.Map(mapContainerRef.current, {
            center: initialPosition,
            zoom: 15,
            disableDefaultUI: true,
        });

        // Limpieza al desmontar el componente
        return () => {
            // No hay una función de 'destroy' explícita, pero eliminar la referencia
            // y asegurar que el contenedor del DOM se elimine es suficiente.
        };

    }, [isApiReady, initialPosition]);

    if (error) {
        return <div className="flex items-center justify-center h-full bg-destructive/10 text-destructive p-4 text-center">{error}</div>;
    }

    if (!isApiReady) {
        return <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>;
    }

    return (
       <div ref={mapContainerRef} className="w-full h-full" />
    );
};

export default GoogleMap;
