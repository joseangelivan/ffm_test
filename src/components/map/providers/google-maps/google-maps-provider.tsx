
"use client";

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';

type GoogleMapsProviderProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [isApiLoaded, setIsApiLoaded] = useState(false);

    useEffect(() => {
        if (!apiKey || isApiLoaded) return;
        
        const timer = setTimeout(() => {
            if (!isApiLoaded) {
                toast({
                    title: t('adminDashboard.settingsGroups.catalogs.maps.billingErrorTitle'),
                    description: t('adminDashboard.settingsGroups.catalogs.maps.billingErrorDescription'),
                    variant: 'destructive',
                    duration: 9000,
                });
            }
        }, 3000);

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
