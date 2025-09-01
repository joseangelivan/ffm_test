

"use client";

import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

interface MapProps {
    children?: React.ReactNode;
    config: any;
    onMapLoad: (map: Map) => void;
}

const OpenLayersMap: React.FC<MapProps> = ({ children, config, onMapLoad }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const olMapRef = useRef<Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || olMapRef.current) return;

        let source;
        const providerType = config?.provider_type || 'openlayers';

        if (providerType === 'google' && config?.api_config?.parameters?.apiKey) {
            source = new XYZ({
                url: `https://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${config.api_config.parameters.apiKey}`,
                attributions: config?.ui_config?.attribution || '© Google',
            });
        } else if (config?.api_config?.base_url) {
             source = new XYZ({
                url: config.api_config.base_url,
                attributions: config?.ui_config?.attribution || undefined,
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
    }, [config, onMapLoad]);

    return (
       <div ref={mapRef} className="w-full h-full">
            {children}
       </div>
    );
};

export default OpenLayersMap;
