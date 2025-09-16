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
    __googleMapsApiLoading__: boolean;
    initGoogleMapsApi: () => void;
    gm_authFailure: () => void;
  }
}

const loadGoogleMapsApi = (apiKey: string, language: string): Promise<void> => {
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
        const langParam = language.split('-')[0]; // Use 'es' or 'pt', not 'pt-BR'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApi&language=${langParam}`;
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
    const { t, locale } = useLocale();

    useEffect(() => {
        let isMounted = true;
        
        // Define el manejador de errores de autenticación de Google Maps
        window.gm_authFailure = () => {
             if (isMounted) {
                setError(t('toast.mapsBillingError.description'));
            }
        };

        const apiKey = provider.config_json?.api_config?.parameters?.apiKey;
        if (apiKey) {
            loadGoogleMapsApi(apiKey, locale)
                .then(() => { if (isMounted) setIsApiReady(true); })
                .catch(err => {
                    console.error("Google Maps API failed to load:", err);
                    if (isMounted) setError("Failed to load Google Maps API. Please check your API key and network connection.");
                });
        } else {
            setError("Google Maps API Key is missing in the provider configuration.");
        }
        return () => { 
            isMounted = false; 
            // Limpia el manejador global cuando el componente se desmonta
            delete window.gm_authFailure;
        };
    }, [provider, locale, t]);

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

    return (
       <div ref={mapContainerRef} className="w-full h-full relative">
           {!isApiReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center h-full bg-muted z-10">
                    <Loader className="h-6 w-6 animate-spin" />
                </div>
           )}
           {error && (
               <div className="absolute top-2 left-2 right-2 z-10">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t('toast.mapsBillingError.title')}</AlertTitle>
                      <AlertDescription>
                        {error}
                      </AlertDescription>
                    </Alert>
               </div>
           )}
       </div>
    );
};

export default GoogleMap;
