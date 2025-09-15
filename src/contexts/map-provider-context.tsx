
"use client";

import React, { createContext, useContext } from 'react';
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
