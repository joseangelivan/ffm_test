

"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import 'ol/ol.css';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import { fromLonLat } from 'ol/proj';

interface MapProps {
    provider: DbMapProvider;
    onMapLoad: (map: Map, source: VectorSource) => void;
    children?: React.ReactNode;
}

const OpenLayersMap: React.FC<MapProps> = ({ 
    provider, 
    onMapLoad, 
    children
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        let config: any;
        try {
            config = typeof provider.config_json === 'string' 
                ? JSON.parse(provider.config_json) 
                : provider.config_json || {};
        } catch (e) {
            console.error("Failed to parse map provider config_json:", e);
            config = {};
        }
        
        const apiConfig = config.api_config || {};
        const baseUrl = apiConfig.base_url;

        let source;
        if (baseUrl) {
            source = new XYZ({ url: baseUrl, maxZoom: 20 });
        } else {
            source = new OSM();
        }
        
        const initialLayer = new TileLayer({ source });
        const vectorSource = new VectorSource();
        const vectorLayer = new VectorLayer({ source: vectorSource });

        const map = new Map({
            target: mapContainerRef.current!,
            layers: [initialLayer, vectorLayer],
            view: new View({
                center: fromLonLat([-51.9253, -14.235]),
                zoom: 4,
            }),
            controls: [],
        });
        
        mapRef.current = map;
        onMapLoad(map, vectorSource);

        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(undefined);
                mapRef.current = null;
            }
        };
    }, [provider, onMapLoad]);


    return (
       <div ref={mapContainerRef} className="w-full h-full">
         {/* Children can be rendered here if they are designed to be map overlays */}
       </div>
    );
};

export default OpenLayersMap;
