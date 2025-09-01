
"use client";

import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import { Loader } from 'lucide-react';

// OpenLayers is now the only renderer
import OpenLayersMap from './providers/openlayers/map';


type MapContainerProps = {
    children?: React.ReactNode;
    provider: DbMapProvider | null;
    onMapLoad: (map: any) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ children, provider, onMapLoad }) => {
    const { t } = useLocale();
    
    if (!provider) {
        return (
            <div className="flex items-center justify-center h-full bg-muted-foreground/10">
                <div className="text-center p-4">
                    <p className="text-muted-foreground font-semibold">
                       {t('adminDashboard.maps.title')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {t('adminDashboard.maps.noServices')}
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <OpenLayersMap provider={provider} onMapLoad={onMapLoad}>
            {children}
        </OpenLayersMap>
    );
}

export default MapContainer;
