
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
        if (!mapRef.current) return;

        let config: any;
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

        const apiKey = config.api_config?.parameters?.apiKey;
        const attribution = config.ui_config?.attribution;
        let baseUrl = config.api_config?.base_url;

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
                // Completely dispose of the map instance to avoid memory leaks.
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
