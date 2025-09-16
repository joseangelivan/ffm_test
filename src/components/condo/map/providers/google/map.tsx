
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import { useLocale } from '@/lib/i18n';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// --- LÓGICA DE CARGA DE API DE GOOGLE ---
declare global {
  interface Window {
    __googleMapsApiPromise__: Promise<void>;
    initGoogleMapsApi: () => void;
    gm_authFailure: () => void;
  }
}

const loadGoogleMapsApi = (apiKey: string, language: string, onAuthFailure: () => void): Promise<void> => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error("Cannot load Google Maps API in SSR."));
    }
    if (window.google?.maps) {
        return Promise.resolve();
    }
    if (window.__googleMapsApiPromise__) {
        return window.__googleMapsApiPromise__;
    }

    window.__googleMapsApiPromise__ = new Promise<void>((resolve, reject) => {
        // Define failure callback FIRST
        window.gm_authFailure = () => {
            onAuthFailure();
            // We don't reject the promise here, because the script itself loaded.
            // We just let the UI handle the error state.
        };

        // Define success callback
        window.initGoogleMapsApi = () => {
            resolve();
            // Clean up global callbacks after load
            delete window.initGoogleMapsApi;
        };

        const script = document.createElement('script');
        const langParam = language.split('-')[0];
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApi&language=${langParam}`;
        script.async = true;
        script.defer = true;
        script.onerror = (error) => {
            reject(new Error("Failed to load Google Maps script. Check network and script URL."));
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
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { t, locale } = useLocale();

    useEffect(() => {
        let isMounted = true;

        const handleAuthFailure = () => {
            if (isMounted) {
                setErrorMessage(t('toast.mapsBillingError.description'));
                setApiStatus('error');
            }
        };

        const apiKey = provider.config_json?.api_config?.parameters?.apiKey;
        if (apiKey) {
            setApiStatus('loading');
            loadGoogleMapsApi(apiKey, locale, handleAuthFailure)
                .then(() => { 
                    if (isMounted && apiStatus !== 'error') {
                        setApiStatus('ready');
                    }
                })
                .catch(err => {
                    console.error("Google Maps API script failed to load:", err);
                    if (isMounted) {
                        setErrorMessage(t('toast.mapsBillingError.description'));
                        setApiStatus('error');
                    }
                });
        } else {
            setErrorMessage("Google Maps API Key is missing in the provider configuration.");
            setApiStatus('error');
        }

        return () => { 
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider.id, locale]); 

    useEffect(() => {
        // Initialize map only when API is ready and container is available
        if (apiStatus === 'ready' && mapContainerRef.current && !mapInstanceRef.current) {
            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: initialPosition,
                zoom: 15,
                disableDefaultUI: true,
            });
            mapInstanceRef.current = map;
        }

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current = null;
            }
        }
    }, [apiStatus, initialPosition]);

    return (
       <div className="w-full h-full relative bg-muted">
           {apiStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center h-full z-10">
                    <Loader className="h-6 w-6 animate-spin" />
                </div>
           )}
           {apiStatus === 'error' && (
               <div className="absolute top-2 left-2 right-2 z-10">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t('toast.mapsBillingError.title')}</AlertTitle>
                      <AlertDescription>
                        {errorMessage}
                      </AlertDescription>
                    </Alert>
               </div>
           )}
            {/* The map div is always present to be targeted */}
            <div ref={mapContainerRef} className="w-full h-full" />
       </div>
    );
};

export default GoogleMap;
