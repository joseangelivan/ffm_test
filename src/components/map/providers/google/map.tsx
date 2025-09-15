
"use client";

import React, { useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api';
import { useLocale } from '@/lib/i18n';
import { Loader } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

interface MapProps {
    children?: React.ReactNode;
    config: any;
    onMapLoad: (map: google.maps.Map | null) => void;
    initialPosition?: { lat: number, lng: number };
}

const GoogleMapProvider: React.FC<MapProps> = ({ children, config, onMapLoad, initialPosition }) => {
    const { t } = useLocale();
    const mapRef = useRef<google.maps.Map | null>(null);
    
    const apiKey = config?.api_config?.parameters?.apiKey;

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey || "",
        libraries: ['maps'],
    });

    const center = initialPosition 
        ? initialPosition 
        : { lat: -14.235, lng: -51.9253 };

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        onMapLoad(map);
    }, [onMapLoad]);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
        onMapLoad(null);
    }, [onMapLoad]);

    if (loadError) {
        return (
             <div className="flex items-center justify-center h-full bg-muted-foreground/10 p-4">
                <p className="text-muted-foreground text-center">
                    Error al cargar el script de Google Maps.
                </p>
            </div>
        );
    }
    
    if (!isLoaded || !apiKey) {
         return (
            <div className="flex items-center justify-center h-full bg-muted">
                {!apiKey ? (
                    <p className="text-muted-foreground text-center p-4">
                        {t('condoDashboard.map.apiKeyMissing.description')}
                    </p>
                ) : (
                    <Loader className="h-6 w-6 animate-spin" />
                )}
            </div>
        );
    }

    return (
           <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={initialPosition ? 15 : 4}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    mapId: config?.api_config?.parameters?.mapId,
                    disableDefaultUI: true,
                    gestureHandling: 'greedy'
                }}
            >
               {children}
            </GoogleMap>
    );
};

export default GoogleMapProvider;
