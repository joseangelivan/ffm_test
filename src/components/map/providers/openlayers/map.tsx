

"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import 'ol/ol.css';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import type { Geofence as DbGeofence } from '@/actions/maps';
import Feature from 'ol/Feature';
import { fromCircle } from 'ol/geom/Polygon';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import type { Draw, Modify } from 'ol/interaction';

// --- STYLES ---
const STYLE_VIEW_MODE = new Style({
  stroke: new Stroke({ color: 'rgba(74, 144, 226, 0.8)', width: 2 }),
  fill: new Fill({ color: 'rgba(74, 144, 226, 0.2)' }),
});

const STYLE_BACKGROUND_GREY = new Style({
  stroke: new Stroke({ color: 'rgba(128, 128, 128, 0.8)', width: 2 }),
  fill: new Fill({ color: 'rgba(128, 128, 128, 0.1)' }),
});

const STYLE_REFERENCE_GREEN = new Style({
  stroke: new Stroke({ color: 'rgba(52, 168, 83, 0.6)', width: 2 }),
  fill: new Fill({ color: 'rgba(52, 168, 83, 0.2)' }),
});

const STYLE_FOCUSED_BLUE = new Style({
  stroke: new Stroke({ color: 'rgba(74, 144, 226, 1.0)', width: 3 }),
  fill: new Fill({ color: 'rgba(74, 144, 226, 0.35)' }),
});

interface MapProps {
    provider: DbMapProvider;
    onMapLoad: (map: Map, source: VectorSource) => void;
    dbGeofences: DbGeofence[];
    activeShapeState: { id: string, feature: Feature | null } | null;
    showAllGeofences: boolean;
    selectedGeofenceId: string | null;
    defaultGeofenceId: string | null;
    mode: 'view' | 'editing';
    initialPosition: { lat: number; lng: number };
    mapRef: React.MutableRefObject<Map | null>;
    drawingInteractionRef: React.MutableRefObject<Draw | null>;
    modifyInteractionRef: React.MutableRefObject<Modify | null>;
}

/**
 * Reads a geometry object, which may be a standard GeoJSON object or a legacy
 * custom object, and returns a valid OpenLayers Geometry.
 * @param geometry The geometry object from the database.
 * @returns An OpenLayers Geometry or null.
 */
function readLegacyOrStandardGeoJSON(geometry: any) {
    if (!geometry || typeof geometry !== 'object' || Object.keys(geometry).length === 0) {
        return null;
    }
    
    if (!geometry.type) {
         console.warn("Invalid geometry object passed to reader (no type):", geometry);
         return null;
    }

    const format = new GeoJSON({ featureProjection: 'EPSG:3857' });

    // Handle legacy Rectangle type
    if (geometry.type.toLowerCase() === 'rectangle') {
        const bounds = geometry.bounds;
        if (bounds && typeof bounds.north === 'number' && typeof bounds.south === 'number' && typeof bounds.east === 'number' && typeof bounds.west === 'number') {
            const coordinates = [
                [bounds.west, bounds.south],
                [bounds.east, bounds.south],
                [bounds.east, bounds.north],
                [bounds.west, bounds.north],
                [bounds.west, bounds.south]
            ];
            const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
            return polygon;
        } else {
             console.error("Invalid coordinate structure for legacy Rectangle geometry:", geometry);
             return null;
        }
    }
    
    // Handle standard GeoJSON types
    try {
        const olGeom = format.readGeometry(geometry);
        // A simple check to see if the geometry is valid (has coordinates)
        if (olGeom && olGeom.getCoordinates() && olGeom.getCoordinates().length > 0) {
            return olGeom;
        }
        console.warn("Invalid geometry object (empty coordinates or malformed):", geometry);
        return null;
    } catch (e) {
        console.error(`Unsupported GeoJSON type or malformed geometry: ${geometry.type}`, e);
        return null;
    }
}


const OpenLayersMap: React.FC<MapProps> = ({ 
    provider, 
    onMapLoad, 
    dbGeofences,
    activeShapeState,
    showAllGeofences,
    selectedGeofenceId,
    defaultGeofenceId,
    mode,
    initialPosition,
    mapRef
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const vectorSourceRef = useRef<VectorSource | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

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
        const parameters = apiConfig.parameters || {};
        const baseUrl = apiConfig.base_url;

        let source;
        if (baseUrl) {
            source = new XYZ({ url: baseUrl, maxZoom: 20 });
        } else {
            source = new OSM();
        }
        
        const initialLayer = new TileLayer({ source });
        vectorSourceRef.current = new VectorSource();
        
        const vectorLayer = new VectorLayer({
            source: vectorSourceRef.current,
            style: (feature) => feature.get('style'),
        });
        vectorLayer.set('id', 'geofence-layer');

        const map = new Map({
            target: mapContainerRef.current!,
            layers: [initialLayer, vectorLayer],
            view: new View({
                center: fromLonLat([initialPosition.lng, initialPosition.lat]),
                zoom: 17,
            }),
            controls: [],
        });
        
        mapRef.current = map;
        onMapLoad(map, vectorSourceRef.current);

        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(undefined);
                mapRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider]);


    // Effect to synchronize dbGeofences with the map's vector source
    useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;

        const featuresToProcess = dbGeofences
            .map(dbGf => {
                // Don't touch the shape being actively edited
                if (activeShapeState?.id === dbGf.id) {
                    return null;
                }
                const geometry = readLegacyOrStandardGeoJSON(dbGf.geometry);
                if (!geometry) {
                    return null; // Skip geofences with invalid/missing geometry
                }
                return { id: dbGf.id, geometry };
            })
            .filter((item): item is { id: string, geometry: any } => item !== null);
        
        const existingFeatureIds = new Set(source.getFeatures().map(f => f.getId()));
        const dbGeofenceIds = new Set(featuresToProcess.map(g => g.id));

        // Add or update features from the database
        featuresToProcess.forEach(({ id, geometry }) => {
            let feature = source.getFeatureById(id);
            if (feature) {
                feature.setGeometry(geometry);
            } else {
                feature = new Feature({ geometry });
                feature.setId(id);
                source.addFeature(feature);
            }
        });

        // Clean up features that are no longer in the DB
        existingFeatureIds.forEach(id => {
            if (id && !dbGeofenceIds.has(id.toString()) && id !== activeShapeState?.id) {
                const featureToRemove = source.getFeatureById(id);
                if (featureToRemove) {
                    source.removeFeature(featureToRemove);
                }
            }
        });
    }, [dbGeofences, activeShapeState?.id]);
    
     // Effect to manage feature styles based on component state
     useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;
        
        source.forEachFeature(feature => {
            const id = feature.getId() as string;
            if (!id || id.startsWith('new-shape-')) return;

            const isBeingEdited = activeShapeState?.id === id;
            const isSelected = id === selectedGeofenceId;
            const isDefault = id === defaultGeofenceId;

            let style = STYLE_BACKGROUND_GREY;
            let visible = true;
            
            if (isBeingEdited) {
                style = STYLE_FOCUSED_BLUE;
            } else {
                 if (mode === 'view') {
                    if (showAllGeofences) {
                        style = isDefault ? STYLE_VIEW_MODE : STYLE_BACKGROUND_GREY;
                    } else {
                        visible = isDefault;
                        if (visible) style = STYLE_VIEW_MODE;
                    }
                } else { // mode === 'editing'
                    if (isSelected) {
                        style = STYLE_REFERENCE_GREEN;
                    } else if (showAllGeofences) {
                        style = STYLE_BACKGROUND_GREY;
                    } else {
                        visible = false;
                    }
                }
            }
            feature.setStyle(visible ? style : undefined);
        });

    }, [mode, selectedGeofenceId, defaultGeofenceId, showAllGeofences, activeShapeState]);


    return (
       <div ref={mapContainerRef} className="w-full h-full" />
    );
};

export default OpenLayersMap;
