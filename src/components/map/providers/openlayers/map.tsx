"use client";

import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import 'ol/ol.css';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Circle as OlCircle, Polygon } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import type { Geofence as DbGeofence } from '@/actions/maps';

// --- ESTILOS ---
const STYLE_VIEW_MODE = new Style({
    fill: new Fill({ color: 'rgba(67, 133, 245, 0.1)' }),
    stroke: new Stroke({ color: '#4385F5', width: 2 }),
});
const STYLE_EDIT_MODE_SELECTED = new Style({
    fill: new Fill({ color: 'rgba(234, 67, 53, 0.2)' }),
    stroke: new Stroke({ color: '#EA4335', width: 3 }),
});
const STYLE_NEW_SHAPE = new Style({
    fill: new Fill({ color: 'rgba(52, 168, 83, 0.2)' }),
    stroke: new Stroke({ color: '#34A853', width: 3 }),
});
const STYLE_EDIT_MODE_UNSELECTED = new Style({
    fill: new Fill({ color: 'rgba(100, 100, 100, 0.1)' }),
    stroke: new Stroke({ color: '#646464', width: 1.5, lineDash: [5, 5] }),
});
const STYLE_EDIT_MODE_FOCUSED = new Style({
    fill: new Fill({ color: 'rgba(67, 133, 245, 0.1)' }),
    stroke: new Stroke({ color: '#4385F5', width: 3 }),
});
const STYLE_HIDDEN = new Style({
    fill: new Fill({ color: 'transparent' }),
    stroke: new Stroke({ color: 'transparent', width: 0 }),
});

function readCustomGeoJSON(dbGeofence: DbGeofence): Geometry | null {
    const geometryObject = dbGeofence.geometry;
    if (!geometryObject || typeof geometryObject !== 'object') return null;

    if (geometryObject.type === 'Circle' && geometryObject.center && geometryObject.radius) {
        const center = fromLonLat(geometryObject.center);
        const circle = new OlCircle(center, geometryObject.radius);
        circle.set('geometryType', 'Circle');
        return circle;
    }
    if (geometryObject.type === 'Rectangle' && geometryObject.coordinates) {
        const coords = geometryObject.coordinates[0];
        if (Array.isArray(coords) && coords.length >= 4) {
            const closedCoords = [...coords, coords[0]];
            const polygon = new Polygon([closedCoords.map(coord => fromLonLat(coord))]);
            polygon.set('geometryType', 'Rectangle');
            return polygon;
        }
    }
    if (geometryObject.type === 'Polygon' && geometryObject.coordinates) {
        try {
            const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
            const geometry = format.readGeometry(geometryObject);
            geometry.set('geometryType', 'Polygon');
            return geometry;
        } catch (e) {
            console.error("Error reading standard GeoJSON Polygon:", e, geometryObject);
            return null;
        }
    }
    return null;
}

interface MapProps {
    provider: DbMapProvider;
    mapRef: React.RefObject<Map | null>;
    onMapLoad?: (map: Map, source: VectorSource) => void;
    dbGeofences?: DbGeofence[];
    mode?: 'view' | 'editing';
    showAllGeofences?: boolean;
    selectedGeofenceId?: string | null;
    defaultGeofenceId?: string | null;
    initialPosition?: { lat: number; lng: number };
    activeShapeState?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    shapeBeingSaved?: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    children?: React.ReactNode;
}

const OpenLayersMap: React.FC<MapProps> = ({
    provider,
    mapRef,
    onMapLoad,
    dbGeofences = [],
    initialPosition = { lat: -14.235, lng: -51.9253 },
    // Las props para geocercas no se usan aquí pero se reciben para mantener la firma consistente
    mode, showAllGeofences, selectedGeofenceId, defaultGeofenceId, activeShapeState, shapeBeingSaved
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());

    useEffect(() => {
        if (!mapContainerRef.current) return;

        let map: Map | null = null;
        
        const apiConfig = provider.config_json?.api_config || {};
        const baseUrl = apiConfig.base_url;

        let source;
        if (baseUrl) {
            source = new XYZ({ url: baseUrl, maxZoom: 20 });
        } else {
            // Falla a un proveedor OSM por defecto si no hay URL base
            source = new OSM();
        }

        map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({ source }),
                new VectorLayer({ source: vectorSourceRef.current })
            ],
            view: new View({
                center: fromLonLat([initialPosition.lng, initialPosition.lat]),
                zoom: 15,
            }),
            controls: [],
        });

        if (onMapLoad) onMapLoad(map, vectorSourceRef.current);
        (mapRef as React.MutableRefObject<Map | null>).current = map;

        return () => {
            if (map) {
                map.setTarget(undefined);
            }
        };
    }, [provider, initialPosition, onMapLoad, mapRef]);

    return (
       <div ref={mapContainerRef} className="w-full h-full" />
    );
};

export default OpenLayersMap;
