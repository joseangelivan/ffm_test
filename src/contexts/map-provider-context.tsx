
"use client";

import React, { createContext, useState, useEffect } from 'react';
import { getAppSetting } from '@/actions/settings';

type MapProviderType = 'google' | 'osm';

interface MapProviderContextType {
    provider: MapProviderType;
    setProvider: (provider: MapProviderType) => void;
    isLoading: boolean;
}

export const MapProviderContext = createContext<MapProviderContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [provider, setProvider] = useState<MapProviderType>('google');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProvider = async () => {
            setIsLoading(true);
            const savedProvider = await getAppSetting('map_provider');
            if (savedProvider === 'google' || savedProvider === 'osm') {
                setProvider(savedProvider);
            }
            setIsLoading(false);
        };

        fetchProvider();
    }, []);

    // We don't save the provider setting here, that should be done in an admin panel.
    const handleSetProvider = (newProvider: MapProviderType) => {
        setProvider(newProvider);
    };
    
    return (
        <MapProviderContext.Provider value={{ provider, setProvider: handleSetProvider, isLoading }}>
            {children}
        </MapProviderContext.Provider>
    );
};
