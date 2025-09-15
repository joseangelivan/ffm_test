"use client";

import React, { useCallback, useRef } from 'react';
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
    
    // Extrae la clave de la configuración y comprueba si es un placeholder.
    const apiKeyFromConfig = config?.api_config?.parameters?.apiKey || '';
    const isApiKeyPlaceholder = apiKeyFromConfig.startsWith('$');
    const apiKey = isApiKeyPlaceholder ? '' : apiKeyFromConfig;

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries: ['maps'],
        preventGoogleFontsLoading: true,
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

    // Si la clave es un placeholder o está vacía, no intentes renderizar el mapa.
    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted p-4">
                <p className="text-muted-foreground text-center">
                    {t('condoDashboard.map.apiKeyMissing.description')}
                </p>
            </div>
        );
    }

    if (loadError) {
        // Este error es por problemas de red, no de clave.
        return (
             <div className="flex items-center justify-center h-full bg-muted-foreground/10 p-4">
                <p className="text-muted-foreground text-center">
                    Error al cargar el script de Google Maps. Revisa tu conexión a internet.
                </p>
            </div>
        );
    }
    
    if (!isLoaded) {
         return (
            <div className="flex items-center justify-center h-full bg-muted">
                <Loader className="h-6 w-6 animate-spin" />
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
