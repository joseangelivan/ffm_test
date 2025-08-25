

"use client";

import React, { useContext } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

type MapContainerProps = {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<MapContainerProps> = ({ children }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-destructive">
                    Error: La clave de API de Google Maps no está configurada.
                </p>
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


const MapContainer: React.FC<MapContainerProps> = ({ children }) => {
    // For now, we only have Google Maps provider. This structure allows for future expansion.
    return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
}

export default MapContainer;
