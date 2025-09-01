
"use client";

import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

interface MapProps {
    children?: React.ReactNode;
    provider: DbMapProvider;
    onMapLoad: (map: Map) => void;
}

const OpenLayersMap: React.FC<MapProps> = ({ children, provider, onMapLoad }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || !provider) return;

        let config: any;
        // Robustly handle config_json whether it's a string or an object
        if (typeof provider.config_json === 'string') {
            try {
                config = JSON.parse(provider.config_json);
            } catch (e) {
                console.error("Failed to parse map provider config_json:", e);
                config = {};
            }
        } else {
            config = provider.config_json || {};
        }

        const apiConfig = config.api_config || {};
        const uiConfig = config.ui_config || {};
        const parameters = apiConfig.parameters || {};
        
        const apiKey = parameters.apiKey;
        const attribution = uiConfig.attribution;
        let baseUrl = apiConfig.base_url;

        // Special handling for Google Maps tiles
        if (provider.provider_type === 'google' && apiKey) {
            baseUrl = `https://mt.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${apiKey}`;
        }
        
        let source;
        if (baseUrl) {
            source = new XYZ({
                url: baseUrl,
                attributions: attribution || undefined,
                attributionsCollapsible: false,
                maxZoom: 20,
            });
        } else {
            // Fallback to default OSM if no base_url is provided
            source = new OSM();
        }
        
        const initialLayer = new TileLayer({ source });

        // Ensure we don't create a new map if one already exists for this component instance.
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new Map({
                target: mapRef.current,
                layers: [initialLayer],
                view: new View({
                    center: fromLonLat([-49.2, -25.4]),
                    zoom: 4,
                }),
                controls: [],
            });
            onMapLoad(mapInstanceRef.current);
        } else {
            // If the map instance exists, just update the layer's source.
            const currentLayers = mapInstanceRef.current.getLayers();
            if (currentLayers.getLength() > 0) {
                 const firstLayer = currentLayers.item(0);
                 if(firstLayer instanceof TileLayer) {
                     firstLayer.setSource(source);
                 }
            } else {
                mapInstanceRef.current.addLayer(initialLayer);
            }
        }

        // Cleanup function: This is crucial. It runs when the component unmounts.
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setTarget(undefined);
                mapInstanceRef.current.dispose();
                mapInstanceRef.current = null;
            }
        };
    }, [provider, onMapLoad]);

    return (
       <div ref={mapRef} className="w-full h-full">
            {children}
       </div>
    );
};

export default OpenLayersMap;
