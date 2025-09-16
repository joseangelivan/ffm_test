
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

let apiPromise: Promise<void> | null = null;

const loadGoogleMapsApi = (apiKey: string, language: string): Promise<void> => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error("Cannot load Google Maps API in SSR."));
    }
    if (window.google?.maps) {
        return Promise.resolve();
    }
    if (apiPromise) {
        return apiPromise;
    }

    apiPromise = new Promise<void>((resolve, reject) => {
        // Define failure callback FIRST
        window.gm_authFailure = () => {
            console.warn("Google Maps API Authentication Failure. This is likely a billing or API key issue.");
            reject(new Error("Google Maps API authentication failed."));
        };

        // Define success callback
        window.initGoogleMapsApi = () => {
            resolve();
        };

        const script = document.createElement('script');
        const langParam = language.split('-')[0];
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApi&language=${langParam}`;
        script.async = true;
        script.defer = true;
        script.onerror = (error) => {
            apiPromise = null; // Reset promise on script load error
            reject(new Error("Failed to load Google Maps script. Check network and script URL."));
        };
        document.head.appendChild(script);
    });

    return apiPromise;
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
    const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { t, locale } = useLocale();

    useEffect(() => {
        let isMounted = true;
        
        async function initialize() {
            const apiKey = provider.config_json?.api_config?.parameters?.apiKey;
            if (!apiKey) {
                if(isMounted) {
                    setErrorMessage("Google Maps API Key is missing.");
                    setApiStatus('error');
                }
                return;
            }
            
            if (!mapContainerRef.current) return;
            
            setApiStatus('loading');
            
            try {
                await loadGoogleMapsApi(apiKey, locale);
                if (isMounted) {
                    setApiStatus('ready');
                    new window.google.maps.Map(mapContainerRef.current!, {
                        center: initialPosition,
                        zoom: 15,
                        disableDefaultUI: true,
                    });
                }
            } catch (error: any) {
                console.error("Google Maps API failed to initialize:", error);
                if (isMounted) {
                    setErrorMessage(t('toast.mapsBillingError.description'));
                    setApiStatus('error');
                }
            }
        }
        
        initialize();

        return () => { 
            isMounted = false;
        };
    }, [provider, locale, initialPosition, t]);

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
