

"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { getDefaultMapProvider, type MapProvider as DbMapProvider } from '@/actions/map_providers';
import { Loader } from 'lucide-react';

// Import map provider components
import GoogleMap from './providers/google/map';
import OpenLayersMap from './providers/openlayers/map';


type MapContainerProps = {
    children?: React.ReactNode;
    onMapLoad: (map: any) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ children, onMapLoad }) => {
    const [provider, setProvider] = useState<DbMapProvider | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useLocale();

    useEffect(() => {
        const fetchProvider = async () => {
            setIsLoading(true);
            try {
                const defaultProvider = await getDefaultMapProvider();
                setProvider(defaultProvider);
            } catch (error) {
                console.error("Failed to fetch map provider:", error);
                setProvider(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProvider();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                 <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }
    
    switch (provider?.provider_type) {
        case 'google':
             return (
                <GoogleMap config={provider?.config_json || null} onMapLoad={onMapLoad}>
                    {children}
                </GoogleMap>
            );
        case 'openlayers':
        case 'leaflet':
        case 'mapbox':
        case 'maplibre':
             return (
                <OpenLayersMap config={provider?.config_json || null} onMapLoad={onMapLoad}>
                    {children}
                </OpenLayersMap>
            );
        default:
            return (
                 <div className="flex items-center justify-center h-full bg-muted-foreground/10">
                    <p className="text-muted-foreground text-center p-4">
                        {provider 
                            ? t('adminDashboard.maps.providerNotSupported', { type: provider.provider_type})
                            : "Nenhum provedor de mapa padrão configurado."
                        }
                    </p>
                </div>
            );
    }
}

export default MapContainer;
