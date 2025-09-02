

"use client";

import React, { useEffect, useRef } from 'react';
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
    initialPosition: { lat: number, lng: number };
}

/**
 * Reads a geometry object, which may be a standard GeoJSON object or a legacy
 * custom object, and returns a valid OpenLayers Geometry.
 * @param geometry The geometry object from the database.
 * @returns An OpenLayers Geometry or null.
 */
function readLegacyOrStandardGeoJSON(geometry: any) {
    if (!geometry || !geometry.type) {
        console.error("Invalid geometry object:", geometry);
        return null;
    }

    const format = new GeoJSON({ featureProjection: 'EPSG:3857' });

    // Handle legacy, non-standard geometry types that were stored as 'Rectangle'
    if (geometry.type === 'Rectangle' && geometry.coordinates) {
        try {
            // Assume the coordinates are already in a polygon-like structure
            const transformedCoords = geometry.coordinates[0].map((coord: number[]) => fromLonLat(coord));
            return new Polygon([transformedCoords]);
        } catch(e) {
            console.error("Error transforming legacy Rectangle geometry:", e);
            return null;
        }
    }
    
    // Handle standard GeoJSON types
    try {
        return format.readGeometry(geometry);
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
    initialPosition
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<Map | null>(null);
    const vectorSourceRef = useRef<VectorSource | null>(null);

    useEffect(() => {
        if (!mapRef.current || !provider || mapInstanceRef.current) return;

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
            style: (feature) => feature.get('style') || STYLE_VIEW_MODE, // Default style
        });
        vectorLayer.set('id', 'geofence-layer');

        const map = new Map({
            target: mapRef.current!,
            layers: [initialLayer, vectorLayer],
            view: new View({
                center: fromLonLat([initialPosition.lng, initialPosition.lat]),
                zoom: 17,
            }),
            controls: [],
        });

        mapInstanceRef.current = map;
        onMapLoad(map, vectorSourceRef.current);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider, initialPosition]);

    useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;

        const existingFeatures = new Set(source.getFeatures().map(f => f.getId()));
        
        dbGeofences.forEach(dbGf => {
            let feature = source.getFeatureById(dbGf.id);
            const geometry = readLegacyOrStandardGeoJSON(dbGf.geometry);
            
            if (!geometry) {
                console.warn(`Could not read geometry for geofence ${dbGf.id}`);
                return;
            }

            if (!feature) {
                feature = new Feature({ geometry });
                feature.setId(dbGf.id);
                source.addFeature(feature);
            } else {
                const currentGeom = feature.getGeometry();
                // Only update geometry if it's different and not being actively edited
                if (activeShapeState?.id !== dbGf.id) {
                     feature.setGeometry(geometry);
                }
            }
            existingFeatures.delete(dbGf.id);
        });

        existingFeatures.forEach(id => {
            if (typeof id === 'string' && id.startsWith('new-shape-')) return;
            if (id !== activeShapeState?.id) {
                const featureToRemove = source.getFeatureById(id!);
                if (featureToRemove) source.removeFeature(featureToRemove);
            }
        });

    }, [dbGeofences, activeShapeState]);

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
            let zIndex = 1;
            
            if (isBeingEdited) {
                style = STYLE_FOCUSED_BLUE;
                zIndex = 3;
            } else {
                 if (mode === 'view') {
                    if (showAllGeofences) {
                        style = isDefault ? STYLE_VIEW_MODE : STYLE_BACKGROUND_GREY;
                        zIndex = isDefault ? 2 : 1;
                    } else {
                        if (isDefault) {
                            style = STYLE_VIEW_MODE;
                            zIndex = 2;
                        } else {
                            feature.setStyle(new Style()); // Hide it
                            return;
                        }
                    }
                } else { // mode === 'editing'
                    if (isSelected) {
                        style = STYLE_REFERENCE_GREEN;
                        zIndex = 2;
                    } else if (showAllGeofences) {
                        style = STYLE_BACKGROUND_GREY;
                        zIndex = 1;
                    } else {
                         feature.setStyle(new Style()); // Hide it
                         return;
                    }
                }
            }

            feature.setStyle(style);
        });

    }, [mode, selectedGeofenceId, defaultGeofenceId, showAllGeofences, activeShapeState, dbGeofences]);


    return (
       <div ref={mapRef} className="w-full h-full" />
    );
};

export default OpenLayersMap;
