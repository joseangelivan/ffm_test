

"use client";

import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
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
import type { Geometry, Polygon as OlPolygon, Circle as OlCircle } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import type MapAdapterInterface from 'ol/Map';
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

// Explicitly import geometry types to use for type checks
const CircleGeom = require('ol/geom/Circle').default;
const PolygonGeom = require('ol/geom/Polygon').default;


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
            
            const newPolygon = new PolygonGeom([coords]);
            newPolygon.set('geometryType', 'Rectangle');
            return newPolygon;
        } else {
            console.warn(`Invalid coordinate structure for legacy Rectangle geometry:`, bounds);
            return null;
        }
    }
    
    // If the type is our custom 'Rectangle', we treat it as a Polygon for OL.
    if (geometryObject.type === 'Rectangle') {
        geometryObject.type = 'Polygon';
    }


    // Standard GeoJSON handling
    if ('type' in geometryObject && 'coordinates' in geometryObject) {
       try {
            const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
            const geometry = format.readGeometry(geometryObject);

            if (dbGeofence.geometry.type === 'Rectangle') {
                 geometry.set('geometryType', 'Rectangle');
            }
            return geometry;
        } catch (e) {
            console.error("Error reading standard GeoJSON:", e, geometryObject);
            return null;
        }
    }
    
    // Handle custom Circle format
    if ('type' in geometryObject && geometryObject.type === 'Circle' && 'center' in geometryObject && 'radius' in geometryObject) {
         const center = fromLonLat(geometryObject.center as [number, number]);
         const newCircle = new CircleGeom(center, geometryObject.radius as number);
         newCircle.set('geometryType', 'Circle');
         return newCircle;
    }
    
    console.warn(`Invalid geometry object passed to reader (no type or incompatible structure):`, geometryObject);
    return null;
}


interface MapProps {
    provider: DbMapProvider;
    onMapLoad: (map: Map, source: VectorSource, adapter: MapAdapterInterface) => void;
    dbGeofences: DbGeofence[];
    mode: 'view' | 'editing';
    showAllGeofences: boolean;
    selectedGeofenceId: string | null;
    defaultGeofenceId: string | null;
    initialPosition: { lat: number, lng: number } | null;
    activeShapeState: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    shapeBeingSaved: { id: string; feature: Feature<any> | null; originalGeometry?: any; } | null;
    onZoomChange: (zoom: number) => void;
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
    activeShapeState,
    shapeBeingSaved,
    onZoomChange,
    ...otherProps
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const adapterRef = useRef<MapAdapterInterface | null>(null);

   const getFeatureStyle = useCallback((featureId: string): Style => {
        if(shapeBeingSaved?.id === featureId) {
            return STYLE_NEW_SHAPE;
        }
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
    }, [mode, showAllGeofences, defaultGeofenceId, selectedGeofenceId, activeShapeState, shapeBeingSaved]);
    
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current || !provider) return;

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
        const baseUrl = apiConfig.base_url || '';

        let source;
        if (baseUrl) {
            source = new XYZ({ url: baseUrl, maxZoom: 20 });
        } else {
            source = new OSM();
        }
        
        const initialLayer = new TileLayer({ source });

        const vectorLayer = new VectorLayer({
            source: vectorSourceRef.current,
            style: (feature) => feature.get('style'),
        });
        vectorLayer.set('id', 'geofence-layer');
        
        const view = new View({
            center: fromLonLat([-51.9253, -14.235]),
            zoom: 4,
        });

        const map = new Map({
            target: mapContainerRef.current!,
            layers: [initialLayer, vectorLayer],
            view: view,
            controls: [],
        });
        
        mapRef.current = map;
        
        const adapter = {
            onMoveEnd: (callback: (zoom: number) => void) => {
               map.on('moveend', () => {
                    const zoom = map.getView().getZoom();
                    if(zoom) callback(Math.round(zoom));
               });
            },
            setCenter: (coords: { lat: number, lng: number }, zoom?: number) => {
                map.getView().setCenter(fromLonLat([coords.lng, coords.lat]));
                if(zoom) map.getView().setZoom(zoom);
            },
            zoomIn: () => {
                const view = map.getView();
                view.animate({ zoom: view.getZoom()! + 1, duration: 250 });
            },
            zoomOut: () => {
                 const view = map.getView();
                view.animate({ zoom: view.getZoom()! - 1, duration: 250 });
            },
            fitToGeofence: (geofenceId: string, paddingPercentage: number) => {
                const source = vectorSourceRef.current;
                const feature = source.getFeatureById(geofenceId);
                if (feature) {
                    const geometry = feature.getGeometry();
                    if (geometry) {
                        const mapSize = map.getSize();
                        if (mapSize) {
                             const padding = mapSize[0] * paddingPercentage;
                             map.getView().fit(geometry, { padding: [padding, padding, padding, padding], duration: 1000 });
                        }
                    }
                }
            },
            getMapInstance: () => map,
        };
        adapterRef.current = adapter;

        onMapLoad(map, vectorSourceRef.current, adapter);

        map.on('moveend', () => {
            const zoom = map.getView().getZoom();
            if (zoom) onZoomChange(Math.round(zoom));
        });

    }, [provider, onMapLoad, onZoomChange]);

    useEffect(() => {
        const map = mapRef.current;
        const adapter = adapterRef.current;
        if (!map || !adapter) return;
        
        const timeoutId = setTimeout(() => {
             if (defaultGeofenceId) {
                adapter.fitToGeofence(defaultGeofenceId, 0.1);
             } else if (initialPosition) {
                 adapter.setCenter(initialPosition, 17);
             }
        }, 100);
        
        return () => clearTimeout(timeoutId);

    }, [defaultGeofenceId, initialPosition]);


    useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;

        const dbGeofenceIds = dbGeofences ? new Set(dbGeofences.map(g => g.id)) : new Set();

        // Add or update features from the database
        if (dbGeofences) {
            dbGeofences.forEach(dbGeofence => {
                const olGeom = readLegacyOrStandardGeoJSON(dbGeofence);
                if (!olGeom) return;

                let feature = source.getFeatureById(dbGeofence.id);
                if (feature) {
                    const currentGeom = feature.getGeometry();
                    if (currentGeom && activeShapeState?.feature !== feature) {
                        
                        let hasChanged = false;
                        if (currentGeom instanceof CircleGeom && olGeom instanceof CircleGeom) {
                            const currentCenter = currentGeom.getCenter();
                            const newCenter = olGeom.getCenter();
                            const currentRadius = currentGeom.getRadius();
                            const newRadius = olGeom.getRadius();
                            hasChanged = (
                                currentCenter[0] !== newCenter[0] ||
                                currentCenter[1] !== newCenter[1] ||
                                currentRadius !== newRadius
                            );
                        } else if (currentGeom instanceof PolygonGeom && olGeom instanceof PolygonGeom) {
                            const currentCoords = JSON.stringify(currentGeom.getCoordinates());
                            const newCoords = JSON.stringify(olGeom.getCoordinates());
                            hasChanged = currentCoords !== newCoords;
                        }

                        if(hasChanged) {
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
        }
        
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
