

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


function readLegacyOrStandardGeoJSON(dbGeofence: DbGeofence): Geometry | null {
    const geometryObject = { ...dbGeofence.geometry };

    if (!geometryObject) {
        return null;
    }
    
    if (typeof geometryObject !== 'object') {
        console.warn(`Invalid geometry object passed to reader (not an object):`, geometryObject);
        return null;
    }

    if (Object.keys(geometryObject).length === 0 && geometryObject.constructor === Object) {
        console.warn(`Invalid geometry object passed to reader (empty object):`, geometryObject);
        return null;
    }

    // Handle legacy Google Maps rectangle format
    if ('bounds' in geometryObject && typeof (geometryObject as any).bounds === 'object') {
        const bounds = (geometryObject as any).bounds;
        if (bounds && bounds.north && bounds.south && bounds.east && bounds.west) {
             const coords = [
                [bounds.west, bounds.south],
                [bounds.east, bounds.south],
                [bounds.east, bounds.north],
                [bounds.west, bounds.north],
                [bounds.west, bounds.south]
            ].map(coord => fromLonLat(coord));
            
            const Polygon = require('ol/geom/Polygon').default;
            const newPolygon = new Polygon([coords]);
            newPolygon.set('geometryType', 'Rectangle');
            return newPolygon;
        } else {
            console.warn(`Invalid coordinate structure for legacy Rectangle geometry:`, bounds);
            return null;
        }
    }
    
    if (geometryObject.type === 'rectangle') {
        geometryObject.type = 'Polygon';
    }

    // Standard GeoJSON handling
    if ('type' in geometryObject && 'coordinates' in geometryObject) {
       try {
            const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
            const geometry = format.readGeometry(geometryObject);
            // If it's a polygon and has 5 coordinates (4 vertices + closing point), it's a rectangle
            if (geometry.getType() === 'Polygon' && (geometry as any).getCoordinates()[0].length === 5) {
                geometry.set('geometryType', 'Rectangle');
            }
            return geometry;
        } catch (e) {
            console.error("Error reading standard GeoJSON:", e, geometryObject);
            return null;
        }
    }
    
    console.warn(`Invalid geometry object passed to reader (no type or incompatible structure):`, geometryObject);
    return null;
}


interface MapProps {
    mapRef: React.RefObject<Map | null>;
    vectorSourceRef: React.RefObject<VectorSource | null>;
    dbGeofences: DbGeofence[];
    mode: 'view' | 'editing';
    showAllGeofences: boolean;
    selectedGeofenceId: string | null;
    defaultGeofenceId: string | null;
    activeShapeState: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    children?: React.ReactNode;
}

const OpenLayersMap: React.FC<MapProps> = ({ 
    mapRef,
    vectorSourceRef,
    dbGeofences,
    mode,
    showAllGeofences,
    selectedGeofenceId,
    defaultGeofenceId,
    activeShapeState,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    
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
        const map = mapRef.current;
        if (map && mapContainerRef.current) {
            map.setTarget(mapContainerRef.current);
        }
        return () => {
            if (map) {
                map.setTarget(undefined);
            }
        };
    }, [mapRef]);


    useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;

        const dbGeofenceIds = new Set(dbGeofences.map(g => g.id));

        // Add or update features from the database
        dbGeofences.forEach(dbGeofence => {
            const olGeom = readLegacyOrStandardGeoJSON(dbGeofence);
            if (!olGeom) return;

            let feature = source.getFeatureById(dbGeofence.id);
            if (feature) {
                const currentGeom = feature.getGeometry();
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
                feature.set('geometryType', olGeom.get('geometryType'));
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

    }, [dbGeofences, mode, showAllGeofences, selectedGeofenceId, defaultGeofenceId, getFeatureStyle, activeShapeState, vectorSourceRef]);


    return (
       <div ref={mapContainerRef} className="w-full h-full">
       </div>
    );
};

export default OpenLayersMap;
