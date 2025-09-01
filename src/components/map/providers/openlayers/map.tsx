
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
        const baseUrl = config?.api_config?.base_url;

        if (baseUrl) {
             source = new XYZ({
                url: baseUrl,
                attributions: config?.ui_config?.attribution || undefined,
                attributionsCollapsible: false
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
