"use client";

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

type GoogleMapsProviderProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [isApiLoaded, setIsApiLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (!apiKey) {
            console.error("Google Maps API Key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is not defined.");
            return;
        }

        const handleAuthError = () => {
            setLoadError(true);
        };
        
        (window as any).gm_authFailure = handleAuthError;

        // Set a timer to detect if the API fails to load for other reasons.
        const timer = setTimeout(() => {
            if (!isApiLoaded && !loadError) {
                 // Check if google.maps is available
                if (typeof window.google === 'undefined' || typeof window.google.maps === 'undefined') {
                    setLoadError(true);
                }
            }
        }, 5000); // 5-second timeout

        return () => {
            clearTimeout(timer);
            // Cleanup the global callback
            (window as any).gm_authFailure = undefined;
        };
    }, [apiKey, isApiLoaded, t, toast, loadError]);
    
    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyMissing')}</AlertTitle>
                    <AlertDescription>
                        {t('adminDashboard.settingsGroups.catalogs.maps.apiKeyInstructions')}
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
                    <AlertTitle>{t('adminDashboard.settingsGroups.catalogs.maps.billingErrorTitle')}</AlertTitle>
                    <AlertDescription>
                        <p>{t('adminDashboard.settingsGroups.catalogs.maps.billingErrorDescription')}</p>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <APIProvider 
            apiKey={apiKey} 
            libraries={['drawing', 'geocoding']} 
            onLoad={() => setIsApiLoaded(true)}
        >
            {children}
        </APIProvider>
    );
};

export default GoogleMapsProvider;
