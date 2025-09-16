

"use client";

import React, { Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

// Carga dinámica de los componentes de mapa específicos del proveedor
const OpenLayersMap = dynamic(() => import('./providers/openlayers/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});

const GoogleMap = dynamic(() => import('@/components/condo/map/providers/google/map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>,
});


export type MapAdapter = {
    onMoveEnd: (callback: (zoom: number) => void) => void;
    setCenter: (coords: { lat: number; lng: number }, zoom?: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    fitToGeofence: (geofenceId: string, paddingPercentage: number) => void;
    getMapInstance: () => any;
};

const MapContainer: React.FC<any> = (props) => {
    const { provider, onMapLoad } = props;

    const createMapAdapter = useCallback((mapInstance: any, providerType: string, vectorSource: any): MapAdapter => {
        if (providerType === 'google') {
            return {
                onMoveEnd: (callback) => {
                    mapInstance.addListener('idle', () => {
                        callback(mapInstance.getZoom() || 15);
                    });
                },
                setCenter: (coords, zoom) => {
                    mapInstance.setCenter(coords);
                    if (zoom) mapInstance.setZoom(zoom);
                },
                zoomIn: () => mapInstance.setZoom(mapInstance.getZoom() + 1),
                zoomOut: () => mapInstance.setZoom(mapInstance.getZoom() - 1),
                fitToGeofence: (geofenceId, padding) => {
                    // Google Maps fitBounds logic would be implemented here
                    console.warn("fitToGeofence not implemented for Google Maps yet.");
                },
                getMapInstance: () => mapInstance,
            };
        } else { // OpenLayers
            const { fromLonLat } = require('ol/proj');
            return {
                onMoveEnd: (callback) => {
                     mapInstance.on('moveend', () => {
                        const zoom = mapInstance.getView().getZoom();
                        if (zoom) callback(zoom);
                    });
                },
                setCenter: (coords, zoom) => {
                     mapInstance.getView().animate({
                        center: fromLonLat([coords.lng, coords.lat]),
                        zoom: zoom || mapInstance.getView().getZoom(),
                        duration: 800,
                    });
                },
                zoomIn: () => mapInstance.getView().setZoom(mapInstance.getView().getZoom() + 1),
                zoomOut: () => mapInstance.getView().setZoom(mapInstance.getView().getZoom() - 1),
                fitToGeofence: (geofenceId, paddingPercentage) => {
                    if (!vectorSource) return;
                    const featureToFit = vectorSource.getFeatureById(geofenceId);
                    if (featureToFit) {
                        const extent = featureToFit.getGeometry()?.getExtent();
                        if (extent && extent.every(isFinite)) {
                             const mapSize = mapInstance.getSize()!;
                             const padding = mapSize.map((s: number) => s * paddingPercentage);
                             mapInstance.getView().fit(extent, {
                                padding: [padding[1], padding[0], padding[1], padding[0]],
                                duration: 800,
                                maxZoom: 20
                            });
                        }
                    }
                },
                getMapInstance: () => mapInstance,
            };
        }
    }, []);

    const handleMapLoad = useCallback((mapInstance: any, source: any) => {
        if (onMapLoad && mapInstance) {
            const adapter = createMapAdapter(mapInstance, provider.provider_type, source);
            onMapLoad(adapter, source);
        }
    }, [onMapLoad, createMapAdapter, provider.provider_type]);


    if (!provider) {
        return <div className="flex items-center justify-center h-full bg-muted"><Loader className="h-6 w-6 animate-spin" /></div>;
    }

    if (provider.provider_type === 'google') {
        return <GoogleMap {...props} onMapLoad={handleMapLoad} />;
    }
    
    // For any other provider type like 'openlayers', 'leaflet', 'mapbox'
    return <OpenLayersMap {...props} onMapLoad={handleMapLoad} />;
}

export default MapContainer;
