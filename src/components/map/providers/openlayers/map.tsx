
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
        if (!mapRef.current || !provider || mapInstanceRef.current) return;

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
        
        const apiConfig = config.api_config || {};
        const uiConfig = config.ui_config || {};
        const parameters = apiConfig.parameters || {};
        
        const apiKey = parameters.apiKey;
        const attribution = uiConfig.attribution;
        let baseUrl = apiConfig.base_url;

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

        const map = new Map({
            target: mapRef.current,
            layers: [initialLayer],
            view: new View({
                center: fromLonLat([-49.2, -25.4]),
                zoom: 4,
            }),
            controls: [],
        });

        mapInstanceRef.current = map;
        onMapLoad(map);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setTarget(undefined);
                mapInstanceRef.current.dispose();
                mapInstanceRef.current = null;
            }
            if (mapRef.current) {
                mapRef.current.innerHTML = '';
            }
        };
    // We only want this to run ONCE when the component mounts.
    // Provider and onMapLoad are stable props from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
       <div ref={mapRef} className="w-full h-full">
            {children}
       </div>
    );
};

export default OpenLayersMap;
