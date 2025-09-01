
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { getDefaultMapProvider, type MapProvider as DbMapProvider } from '@/actions/map_providers';
import { Loader } from 'lucide-react';
import GoogleMapComponent from '@/components/map/providers/google-maps/map';
import LeafletMapPlaceholder from './providers/leaflet/map';

type MapContainerProps = {
    children: React.ReactNode;
}

const GoogleMapsProviderWrapper: React.FC<{ config: any, children: React.ReactNode }> = ({ config, children }) => {
    const { toast } = useToast();
    const { t } = useLocale();

    let apiKey = config?.api_config?.parameters?.apiKey;
    if (typeof apiKey === 'string' && apiKey.startsWith('$')) {
        const envVarName = apiKey.substring(1);
        if (typeof process !== 'undefined' && process.env[envVarName]) {
            apiKey = process.env[envVarName];
        } else {
            apiKey = '';
            console.error(`Environment variable ${envVarName} not found.`);
        }
    }

    const handleApiError = (error: { name: string, message: string, cause: any }) => {
        if (error.name === 'BillingNotEnabledMapError') {
             toast({
                title: t('toast.mapsBillingError.title'),
                description: t('toast.mapsBillingError.description'),
                variant: 'destructive',
            });
        } else {
            console.error('Google Maps API Error:', error);
        }
    };

    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-destructive text-center p-4">
                    {t('condoDashboard.map.apiKeyMissing.title')}
                </p>
            </div>
        );
    }
    
    return (
        <APIProvider 
            apiKey={apiKey} 
            libraries={['drawing', 'geocoding', 'places', 'marker']}
            onLoad={() => console.log('Maps API loaded.')}
            onError={(e) => handleApiError(e)}
        >
            {React.cloneElement(children as React.ReactElement, { config: config.api_config.parameters })}
        </APIProvider>
    );
};


const MapContainer: React.FC<MapContainerProps> = ({ children }) => {
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
            <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-destructive text-center p-4">
                    {t('adminDashboard.maps.noServices')}
                </p>
            </div>
        )
    }

    switch(provider.provider_type) {
        case 'google':
            return (
                 <GoogleMapsProviderWrapper config={provider.config_json}>
                    {children}
                 </GoogleMapsProviderWrapper>
            );
        
        case 'leaflet':
           return <LeafletMapPlaceholder />;
        
        default:
             return (
                <div className="flex items-center justify-center h-full bg-muted">
                    <p className="text-destructive text-center p-4">
                        {t('adminDashboard.maps.providerNotSupported', { type: provider.provider_type })}
                    </p>
                </div>
            )
    }
}

export default MapContainer;
