
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
    const olMapRef = useRef<Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || olMapRef.current) return;

        let source;
        const config = provider.config_json || {};
        const apiKey = config.api_config?.parameters?.apiKey;
        const attribution = config.ui_config?.attribution;
        let baseUrl = config.api_config?.base_url;

        // Special handling for Google Maps tiles
        if (provider.provider_type === 'google' && apiKey) {
             baseUrl = `https://mt.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${apiKey}`;
        }
        
        if (baseUrl) {
             source = new XYZ({
                url: baseUrl,
                attributions: attribution || undefined,
                attributionsCollapsible: false,
                maxZoom: 20
            });
        }
        else {
            source = new OSM(); // Default to OpenStreetMap
        }

        const map = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: source,
                })
            ],
            view: new View({
                center: fromLonLat([-49.2, -25.4]), // Default center
                zoom: 4, // Default zoom
            }),
            controls: [], // Remove default controls
        });

        olMapRef.current = map;
        onMapLoad(map);
        
        return () => {
            if (olMapRef.current) {
                olMapRef.current.setTarget(undefined);
                olMapRef.current = null;
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
