

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
import { fromLonLat, transform } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Circle as OlCircle, Polygon } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import type { Geofence as DbGeofence } from '@/actions/maps';


const STYLE_VIEW_MODE = new Style({
    fill: new Fill({ color: 'rgba(67, 133, 245, 0.1)' }),
    stroke: new Stroke({ color: '#4385F5', width: 2 }),
});

const STYLE_EDIT_MODE_SELECTED = new Style({
    fill: new Fill({ color: 'rgba(234, 67, 53, 0.2)' }),
    stroke: new Stroke({ color: '#EA4335', width: 3 }),
});

const STYLE_NEW_SHAPE = new Style({
    fill: new Fill({ color: 'rgba(52, 168, 83, 0.2)' }), // Green fill
    stroke: new Stroke({ color: '#34A853', width: 3 }), // Green stroke
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

    if (!geometryObject || typeof geometryObject !== 'object') {
        console.warn(`Invalid geometry object passed to reader (not an object):`, geometryObject);
        return null;
    }
    
    // Handle our custom Circle format
    if (geometryObject.type === 'Circle' && geometryObject.center && geometryObject.radius) {
        const center = fromLonLat(geometryObject.center);
        return new OlCircle(center, geometryObject.radius);
    }
    
    // Handle standard GeoJSON Polygon (and legacy rectangles)
    if (geometryObject.type === 'Polygon' || geometryObject.type === 'rectangle') {
       try {
            const geojson = { ...geometryObject };
            if (geojson.type === 'rectangle') geojson.type = 'Polygon'; // Treat legacy rectangle as polygon
            
            const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
            const geometry = format.readGeometry(geojson);
            
            // Heuristic to tag rectangles for special handling during modification
            if (geometry.getType() === 'Polygon' && (geometry as any).getCoordinates()[0].length === 5) {
                geometry.set('geometryType', 'Rectangle');
            }
            return geometry;
        } catch (e) {
            console.error("Error reading standard GeoJSON:", e, geometryObject);
            return null;
        }
    }

    console.warn(`Invalid or unsupported geometry object passed to reader:`, geometryObject);
    return null;
}


interface MapProps {
    provider: DbMapProvider;
    onMapLoad: (map: Map, source: VectorSource) => void;
    dbGeofences: DbGeofence[];
    mode: 'view' | 'editing';
    showAllGeofences: boolean;
    selectedGeofenceId: string | null;
    defaultGeofenceId: string | null;
    initialPosition: { lat: number, lng: number };
    mapRef: React.RefObject<Map | null>;
    activeShapeState: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    children?: React.ReactNode;
}

const OpenLayersMap: React.FC<MapProps> = ({ 
    provider, 
    onMapLoad, 
    dbGeofences,
    mode,
    showAllGeofences,
    selectedGeofenceId,
    defaultGeofenceId,
    initialPosition,
    mapRef,
    activeShapeState,
    ...otherProps
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const vectorSourceRef = useRef<VectorSource | null>(null);

   const getFeatureStyle = useCallback((featureId: string): Style => {
        if (mode === 'view') {
            if (showAllGeofences) {
                return featureId === defaultGeofenceId ? STYLE_VIEW_MODE : STYLE_EDIT_MODE_UNSELECTED;
            }
            return featureId === defaultGeofenceId ? STYLE_VIEW_MODE : STYLE_HIDDEN;
        } else { // mode === 'editing'
             if (activeShapeState && featureId === activeShapeState.id) {
                if (activeShapeState.id.startsWith('new-shape-')) {
                    return STYLE_NEW_SHAPE;
                }
                return STYLE_EDIT_MODE_SELECTED;
            }
            if (featureId === selectedGeofenceId) {
                return STYLE_EDIT_MODE_FOCUSED;
            }
            return STYLE_EDIT_MODE_UNSELECTED;
        }
    }, [mode, showAllGeofences, defaultGeofenceId, selectedGeofenceId, activeShapeState]);
    
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return; // Prevent re-initialization

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
        
        const tileLayer = new TileLayer({ source });
        
        const initialFeatures = dbGeofences.map(dbGeofence => {
            const olGeom = readCustomGeoJSON(dbGeofence);
            if (!olGeom) return null;
            const feature = new Feature({ geometry: olGeom });
            feature.setId(dbGeofence.id);
            if (olGeom instanceof Polygon) {
                feature.set('geometryType', olGeom.get('geometryType'));
            }
            return feature;
        }).filter((f): f is Feature<Geometry> => f !== null);

        const localVectorSource = new VectorSource({ features: initialFeatures });
        vectorSourceRef.current = localVectorSource;

        const vectorLayer = new VectorLayer({
            source: localVectorSource,
            style: (feature) => feature.get('style'),
        });
        vectorLayer.set('id', 'geofence-layer');

        const map = new Map({
            target: mapContainerRef.current!,
            layers: [tileLayer, vectorLayer],
            view: new View({
                center: fromLonLat([initialPosition.lng, initialPosition.lat]),
                zoom: 4,
            }),
            controls: [],
        });
        
        (mapRef as React.MutableRefObject<Map | null>).current = map;
        onMapLoad(map, localVectorSource);

        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(undefined);
            }
        };
    }, []); // This effect should only run once on mount

    useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;

        const dbGeofenceIds = new Set(dbGeofences.map(g => g.id));

        // Add or update features from the database
        dbGeofences.forEach(dbGeofence => {
            const olGeom = readCustomGeoJSON(dbGeofence);
            if (!olGeom) return;

            let feature = source.getFeatureById(dbGeofence.id);
            if (feature) {
                const currentGeom = feature.getGeometry();
                // Only update geometry if it's not the currently edited shape
                if (currentGeom && activeShapeState?.feature !== feature) {
                    const currentCoords = JSON.stringify(currentGeom.getCoordinates());
                    const newCoords = JSON.stringify(olGeom.getCoordinates());
                    if(currentCoords !== newCoords) {
                         feature.setGeometry(olGeom);
                    }
                }
            } else {
                feature = new Feature({ geometry: olGeom });
                feature.setId(dbGeofence.id);
                if (olGeom instanceof Polygon) {
                    feature.set('geometryType', olGeom.get('geometryType'));
                }
                source.addFeature(feature);
            }
        });
        
        // Add the currently active new shape if it's not already on the map
        if (activeShapeState?.feature && !source.hasFeature(activeShapeState.feature)) {
            source.addFeature(activeShapeState.feature);
        }

        // Clean up features that are no longer in DB and are not the active shape
        source.getFeatures().forEach(feature => {
            const featureId = feature.getId() as string;
            if (!dbGeofenceIds.has(featureId) && featureId !== activeShapeState?.id) {
                source.removeFeature(feature);
            }
        });

        // Apply styles to all features
        source.getFeatures().forEach(feature => {
            const featureId = feature.getId() as string;
            const style = getFeatureStyle(featureId);
            feature.set('style', style);
        });

        source.changed();

    }, [dbGeofences, mode, showAllGeofences, selectedGeofenceId, defaultGeofenceId, getFeatureStyle, activeShapeState]);


    return (
       <div ref={mapContainerRef} className="w-full h-full">
       </div>
    );
};

export default OpenLayersMap;
