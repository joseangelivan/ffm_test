
"use client";

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { getDefaultMapProvider, type MapProvider as DbMapProvider } from '@/actions/map_providers';
import { Loader } from 'lucide-react';
import { getAppSetting } from '@/actions/settings';

type MapContainerProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<MapContainerProps & { config: any }> = ({ children, config }) => {
    const { toast } = useToast();
    const { t } = useLocale();
    
    let apiKey = config?.apiKey;
    if (typeof apiKey === 'string' && apiKey.startsWith('$')) {
        apiKey = process.env[apiKey.substring(1)] || '';
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
            {children}
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
            const defaultProvider = await getDefaultMapProvider();
            setProvider(defaultProvider);
            setIsLoading(false);
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
            return <GoogleMapsProvider config={provider.config_json}>{children}</GoogleMapsProvider>;
        // Add cases for other providers here in the future
        // case 'leaflet':
        //    return <LeafletProvider>{children}</LeafletProvider>;
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
