

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
import { Modify, Translate } from 'ol/interaction';


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

    console.warn(`Invalid or unsupported geometry object passed to reader:`, geometryObject);
    return null;
}


interface MapProps {
    provider: DbMapProvider;
    mapRef: React.RefObject<Map | null>;
    onMapLoad: (map: Map, source: VectorSource) => void;
    googleMapsApiKey?: string;
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
    googleMapsApiKey,
    dbGeofences = [],
    mode = 'view',
    showAllGeofences = false,
    selectedGeofenceId = null,
    defaultGeofenceId = null,
    initialPosition = { lat: -14.235, lng: -51.9253 }, // Default to Brazil
    activeShapeState = null,
    shapeBeingSaved = null,
    ...otherProps
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());

   const getFeatureStyle = useCallback((featureId: string): Style => {
        if (shapeBeingSaved && featureId === shapeBeingSaved.id) {
            return STYLE_EDIT_MODE_SELECTED;
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
    
    // Effect for initializing the map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const config = provider.config_json || {};
        const providerType = provider.provider_type || config.provider_type;
        const apiConfig = config.api_config || {};
        
        let source;
        if (providerType === 'google') {
            const GoogleSource = require('ol/source/Google').default;
            const apiKey = googleMapsApiKey || '';
            source = new GoogleSource({
                key: apiKey,
                mapTypeId: apiConfig.parameters?.mapId || 'roadmap',
            });
            
        } else { // Fallback for openlayers, mapbox, leaflet
            const baseUrl = apiConfig.base_url;
            if (baseUrl) {
                source = new XYZ({ url: baseUrl, maxZoom: 20 });
            } else {
                source = new OSM();
            }
        }
        
        const initialLayer = new TileLayer({ source });
        
        const vectorLayer = new VectorLayer({
            source: vectorSourceRef.current,
            style: (feature) => feature.get('style'),
        });
        vectorLayer.set('id', 'geofence-layer');

        const defaultGeofence = dbGeofences.find(g => g.is_default);
        const hasDefaultGeofenceWithGeometry = defaultGeofence && defaultGeofence.geometry && Object.keys(defaultGeofence.geometry).length > 0;

        const center = (initialPosition && !hasDefaultGeofenceWithGeometry) 
            ? fromLonLat([initialPosition.lng, initialPosition.lat]) 
            : fromLonLat([-51.9253, -14.235]);

        const zoom = (initialPosition && !hasDefaultGeofenceWithGeometry) ? 15 : 4;

        const map = new Map({
            target: mapContainerRef.current!,
            layers: [initialLayer, vectorLayer],
            view: new View({
                center: center,
                zoom: zoom,
            }),
            controls: [],
        });
        
        // Use the passed ref
        if (mapRef) {
            (mapRef as React.MutableRefObject<Map | null>).current = map;
        }
        
        if (onMapLoad) {
            onMapLoad(map, vectorSourceRef.current);
        }
        
        const pointerMoveHandler = (e: any) => {
            if (e.dragging || !mapRef || !mapRef.current) return;
            const mapInstance = mapRef.current;
            const pixel = mapInstance.getEventPixel(e.originalEvent);

            const modifyInteraction = mapInstance.getInteractions().getArray().find(i => i instanceof Modify);
            if (modifyInteraction && (modifyInteraction as any).getOverlay) {
                const overlaySource = (modifyInteraction as any).getOverlay().getSource();
                 if (overlaySource && overlaySource.getFeaturesAtCoordinate(e.coordinate).length > 0) {
                    mapInstance.getTargetElement().style.cursor = 'crosshair';
                    return;
                }
            }
            
            const translateInteraction = mapInstance.getInteractions().getArray().find(i => i.constructor.name === 'Translate');
            const hit = mapInstance.hasFeatureAtPixel(pixel, {
                 hitTolerance: 5,
                 layerFilter: (l) => l.getSource() === vectorSourceRef.current
            });

            if (hit && translateInteraction && (translateInteraction as any).getFeatures && (translateInteraction as any).getFeatures().getLength() > 0) {
                 mapInstance.getTargetElement().style.cursor = 'move';
            } else {
                 mapInstance.getTargetElement().style.cursor = '';
            }
        };

        map.on('pointermove', pointerMoveHandler);

        return () => {
            if (mapRef && mapRef.current) {
                 mapRef.current.un('pointermove', pointerMoveHandler);
                 mapRef.current.setTarget(undefined);
                 (mapRef as React.MutableRefObject<Map | null>).current = null;
            }
        };
    }, [provider, initialPosition, onMapLoad, dbGeofences, googleMapsApiKey, mapRef]);

    // Effect for updating features and styles
    useEffect(() => {
        const source = vectorSourceRef.current;
        if (!source) return;

        const dbGeofenceIds = new Set(dbGeofences.map(g => g.id));
        source.getFeatures().forEach(feature => {
            const featureId = feature.getId() as string;
            if (!dbGeofenceIds.has(featureId) && featureId !== activeShapeState?.id) {
                source.removeFeature(feature);
            }
        });
        
        dbGeofences.forEach(dbGeofence => {
            const olGeom = readCustomGeoJSON(dbGeofence);
            if (!olGeom) return;
            let feature = source.getFeatureById(dbGeofence.id);
            if (feature) {
                if (activeShapeState?.feature !== feature) {
                    feature.setGeometry(olGeom);
                }
            } else {
                feature = new Feature({ geometry: olGeom });
                feature.setId(dbGeofence.id);
                feature.set('geometryType', olGeom.get('geometryType'));
                source.addFeature(feature);
            }
        });
        
        if (activeShapeState?.feature && !source.hasFeature(activeShapeState.feature)) {
            source.addFeature(activeShapeState.feature);
        }

        source.getFeatures().forEach(feature => {
            const featureId = feature.getId() as string;
            const style = getFeatureStyle(featureId);
            feature.set('style', style);
        });

        source.changed();

    }, [dbGeofences, mode, showAllGeofences, selectedGeofenceId, defaultGeofenceId, activeShapeState, getFeatureStyle, shapeBeingSaved]);


    return (
       <div ref={mapContainerRef} className="w-full h-full">
       </div>
    );
};

export default OpenLayersMap;
