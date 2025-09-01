
"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { getDefaultMapProvider, type MapProvider as DbMapProvider } from '@/actions/map_providers';
import { Loader } from 'lucide-react';

// OpenLayers is now the only renderer
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

    if (!provider) {
        return (
            <div className="flex items-center justify-center h-full bg-muted-foreground/10">
                <p className="text-muted-foreground text-center p-4">
                    Nenhum provedor de mapa padrão configurado.
                </p>
            </div>
        );
    }
    
    // Always render OpenLayersMap, and pass it the provider configuration.
    // It will be responsible for interpreting the config and setting the correct tile source.
    return (
        <OpenLayersMap provider={provider} onMapLoad={onMapLoad}>
            {children}
        </OpenLayersMap>
    );
}

export default MapContainer;
