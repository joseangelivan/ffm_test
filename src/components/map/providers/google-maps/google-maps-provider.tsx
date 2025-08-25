"use client";

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useLocale } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

type GoogleMapsProviderProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    const { t } = useLocale();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const originalError = console.error;
        const newError = (...args: any) => {
            if (typeof args[0] === 'string' && args[0].includes('Google Maps JavaScript API error: BillingNotEnabledMapError')) {
                setLoadError(true);
            }
             // Call the original console.error
            originalError.apply(console, args);
        };

        console.error = newError;

        return () => {
            console.error = originalError;
        };
    }, []);

    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('condoDashboard.map.apiKeyMissing.title')}</AlertTitle>
                    <AlertDescription>
                        {t('condoDashboard.map.apiKeyMissing.description')}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (loadError) {
         return (
            <div className="flex items-center justify-center h-full bg-muted">
                <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('condoDashboard.map.billingError.title')}</AlertTitle>
                    <AlertDescription>
                        {t('condoDashboard.map.billingError.description')}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <APIProvider 
            apiKey={apiKey} 
            libraries={['drawing', 'geocoding']}
        >
            {children}
        </APIProvider>
    );
};

export default GoogleMapsProvider;
