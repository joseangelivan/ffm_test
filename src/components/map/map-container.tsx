

"use client";

import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import MapComponent from '@/components/map';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

type MapContainerProps = {
    children?: React.ReactNode;
    provider?: DbMapProvider | null;
    onMapLoad?: (map: any) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ children, provider, onMapLoad }) => {
    return <MapComponent>{children}</MapComponent>
}

export default MapContainer;
