
"use client";

import React, { useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';

interface MapProps {
    children?: React.ReactNode;
    config: any;
    onMapLoad: (map: google.maps.Map) => void;
}

const GoogleMap: React.FC<MapProps> = ({ children, config, onMapLoad }) => {
    const { toast } = useToast();
    const { t } = useLocale();
    const mapRef = useRef<google.maps.Map | null>(null);
    
    const apiKey = config?.api_config?.parameters?.apiKey;
    const mapId = config?.api_config?.parameters?.mapId;

    useEffect(() => {
        const handleBillingError = () => {
            toast({
                title: t('toast.mapsBillingError.title'),
                description: t('toast.mapsBillingError.description'),
                variant: 'destructive',
                duration: 10000,
            });
        };
        
        window.gm_authFailure = handleBillingError;

        return () => {
            delete (window as any).gm_authFailure;
        }
    }, [toast, t]);


    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted-foreground/10">
                <p className="text-muted-foreground text-center p-4">
                    {t('condoDashboard.map.apiKeyMissing.description')}
                </p>
            </div>
        );
    }

    return (
       <APIProvider apiKey={apiKey}>
           <Map
                ref={mapRef}
                mapId={mapId}
                defaultCenter={{ lat: -14.235, lng: -51.9253 }}
                defaultZoom={4}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
                onTilesLoaded={() => {
                    if(mapRef.current) {
                        onMapLoad(mapRef.current);
                    }
                }}
            >
               {children}
            </Map>
       </APIProvider>
    );
};

export default GoogleMap;
