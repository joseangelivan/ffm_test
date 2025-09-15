
"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';

const libraries: Libraries = ['maps'];

interface GoogleMapsLoaderContextType {
    isLoaded: boolean;
    loadError: Error | undefined;
}

const GoogleMapsLoaderContext = createContext<GoogleMapsLoaderContextType | undefined>(undefined);

export const GoogleMapsLoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries,
        preventGoogleFontsLoading: true,
    });

    useEffect(() => {
        const originalConsoleError = console.error;
        const messagesToIgnore = [
            "Google Maps JavaScript API error: InvalidKeyMapError",
            "Google Maps JavaScript API error: BillingNotEnabledMapError",
        ];

        console.error = (...args) => {
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                const shouldIgnore = messagesToIgnore.some(msg => firstArg.startsWith(msg));
                if (shouldIgnore) {
                    return;
                }
            }
            originalConsoleError(...args);
        };

        return () => {
            // Restore original console.error when component unmounts
            console.error = originalConsoleError;
        };
    }, []);


    return (
        <GoogleMapsLoaderContext.Provider value={{ isLoaded, loadError }}>
            {children}
        </GoogleMapsLoaderContext.Provider>
    );
};

export const useGoogleMapsLoader = () => {
    const context = useContext(GoogleMapsLoaderContext);
    if (context === undefined) {
        throw new Error('useGoogleMapsLoader must be used within a GoogleMapsLoaderProvider');
    }
    return context;
};
