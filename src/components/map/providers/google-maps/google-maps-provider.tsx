
"use client";

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { Loader } from 'lucide-react';

type GoogleMapsProviderProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [isApiLoaded, setIsApiLoaded] = useState(false);

    useEffect(() => {
        if (!apiKey) {
            console.error("Google Maps API Key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is not defined.");
            return;
        }

        // Set a timer to detect if the API fails to load, which is a symptom of the billing error.
        const timer = setTimeout(() => {
            if (!isApiLoaded) {
                toast({
                    title: t('adminDashboard.settingsGroups.catalogs.maps.billingErrorTitle'),
                    description: t('adminDashboard.settingsGroups.catalogs.maps.billingErrorDescription'),
                    variant: 'destructive',
                    duration: 15000,
                });
            }
        }, 3000); // 3-second timeout

        return () => clearTimeout(timer);
    }, [apiKey, isApiLoaded, t, toast]);
    
    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-destructive text-center p-4">
                    {t('adminDashboard.settingsGroups.catalogs.maps.apiKeyInstructions')}
                </p>
            </div>
        );
    }

    return (
        <APIProvider apiKey={apiKey} libraries={['drawing', 'geocoding']} onLoad={() => setIsApiLoaded(true)}>
            {children}
        </APIProvider>
    );
};

export default GoogleMapsProvider;
