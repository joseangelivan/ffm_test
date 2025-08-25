
"use client";

import React, { useContext } from 'react';
import { MapProviderContext, MapProvider } from '@/contexts/map-provider-context';
import GoogleMapsProvider from './providers/google-maps/google-maps-provider';

// Import other providers here, e.g.:
// import OpenStreetMapProvider from './providers/osm/osm-provider';

type MapContainerProps = {
    children: React.ReactNode;
}

const MapContainer: React.FC<MapContainerProps> = ({ children }) => {
    const mapContext = useContext(MapProviderContext);

    // Default to Google Maps if no provider is set in context
    const provider = mapContext?.provider || 'google';

    const renderProvider = () => {
        switch (provider) {
            case 'google':
                return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
            // case 'osm':
            //     return <OpenStreetMapProvider>{children}</OpenStreetMapProvider>;
            default:
                return (
                    <div className="flex items-center justify-center h-full bg-muted">
                        <p className="text-destructive">
                            Error: Proveedor de mapas no válido seleccionado.
                        </p>
                    </div>
                );
        }
    }

    return renderProvider();
}

const WrappedMapContainer: React.FC<MapContainerProps> = ({ children }) => (
    <MapProvider>
        <MapContainer>{children}</MapContainer>
    </MapProvider>
);


export default WrappedMapContainer;
