
"use client";

import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';

type MapContainerProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<MapContainerProps> = ({ children }) => {
    const { toast } = useToast();
    const { t } = useLocale();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const handleApiError = (error: { name: string, message: string, cause: any }) => {
        // Intercept the specific billing error to show a friendly toast
        // instead of the default Google Maps error overlay.
        if (error.name === 'BillingNotEnabledMapError') {
             toast({
                title: t('toast.mapsBillingError.title'),
                description: t('toast.mapsBillingError.description'),
                variant: 'destructive',
            });
            // We don't re-throw or console.error here to prevent other error handlers
            // from picking it up and to allow the map to render in development mode.
        } else {
            console.error('Google Maps API Error:', error);
        }
    };

    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-destructive">
                    {t('condoDashboard.map.apiKeyMissing.title')}
                </p>
            </div>
        );
    }
    
    return (
        <APIProvider 
            apiKey={apiKey} 
            libraries={['drawing', 'geocoding']}
            onLoad={() => console.log('Maps API loaded.')}
            onError={(e) => handleApiError(e)}
        >
            {children}
        </APIProvider>
    );
};


const MapContainer: React.FC<MapContainerProps> = ({ children }) => {
    // For now, we only have Google Maps provider. This structure allows for future expansion.
    return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
}

export default MapContainer;
