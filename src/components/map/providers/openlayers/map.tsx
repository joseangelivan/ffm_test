"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import GoogleSource from 'ol/source/Google';
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


// --- LÓGICA DE CARGA DE API DE GOOGLE ---
declare global {
  interface Window {
    __googleMapsApiPromise__: Promise<void>;
    __googleMapsApiLoading__: boolean;
  }
}

const loadGoogleMapsApi = (apiKey: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error("Cannot load Google Maps API in SSR."));
  }
  
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__googleMapsApiPromise__) {
    return window.__googleMapsApiPromise__;
  }
  
  window.__googleMapsApiPromise__ = new Promise<void>((resolve, reject) => {
    (window as any).initGoogleMapsApi = () => {
      window.__googleMapsApiLoading__ = false;
      resolve();
      delete (window as any).initGoogleMapsApi;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApi`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.__googleMapsApiLoading__ = false;
      reject(new Error("Failed to load Google Maps script."));
      delete (window as any).initGoogleMapsApi;
    };
    document.head.appendChild(script);
  });
  
  return window.__googleMapsApiPromise__;
};


// --- LECTOR DE GEOJSON PERSONALIZADO ---
function readCustomGeoJSON(dbGeofence: DbGeofence): Geometry | null {
    const geometryObject = dbGeofence.geometry;

    if (!geometryObject || typeof geometryObject !== 'object') {
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

    return null;
}


// --- TIPOS Y COMPONENTE PRINCIPAL ---
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
    mode = 'view',
    showAllGeofences = false,
    selectedGeofenceId = null,
    defaultGeofenceId = null,
    initialPosition = { lat: -14.235, lng: -51.9253 },
    activeShapeState = null,
    shapeBeingSaved = null,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const [isApiReady, setIsApiReady] = useState(false);
    
    // Efecto para cargar APIs externas
    useEffect(() => {
      let isMounted = true;
      if (provider.provider_type === 'google') {
          const apiKey = provider.config_json?.api_config?.parameters?.apiKey;
          if (apiKey) {
              loadGoogleMapsApi(apiKey)
                  .then(() => { if (isMounted) setIsApiReady(true); })
                  .catch(error => console.error("Google Maps API failed to load:", error));
          } else {
              console.error("Google Maps API Key is missing for provider.");
          }
      } else {
          setIsApiReady(true);
      }
      return () => { isMounted = false; };
    }, [provider]);

    // Efecto para inicializar y destruir el mapa
    useEffect(() => {
        if (!isApiReady || !mapContainerRef.current) {
            return;
        }

        let map: Map | null = null;
        
        const apiConfig = provider.config_json?.api_config || {};
        const baseUrl = apiConfig.base_url;

        let source;
        if (provider.provider_type === 'google') {
            source = new GoogleSource({
                key: provider.config_json?.api_config?.parameters?.apiKey,
            });
        } else if (baseUrl) {
            source = new XYZ({ url: baseUrl, maxZoom: 20 });
        } else {
            source = new OSM();
        }
        
        map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({ source }),
                new VectorLayer({ source: vectorSourceRef.current, style: (feature) => feature.get('style') })
            ],
            view: new View({
                center: fromLonLat([initialPosition.lng, initialPosition.lat]),
                zoom: 15,
            }),
            controls: [],
        });

        (mapRef as React.MutableRefObject<Map | null>).current = map;
        if (onMapLoad) onMapLoad(map, vectorSourceRef.current);
        
        return () => {
            if (map) {
                map.setTarget(undefined);
                (mapRef as React.MutableRefObject<Map | null>).current = null;
                map = null;
            }
        };
    }, [provider, initialPosition, onMapLoad, mapRef, isApiReady]);


    // Efecto para actualizar estilos y geometrías
    const getFeatureStyle = useCallback((featureId: string): Style => {
        if (shapeBeingSaved && featureId === shapeBeingSaved.id) {
            return STYLE_EDIT_MODE_SELECTED;
        }
        if (mode === 'view') {
            if (showAllGeofences) {
                return featureId === defaultGeofenceId ? STYLE_VIEW_MODE : STYLE_EDIT_MODE_UNSELECTED;
            }
            return featureId === defaultGeofenceId ? STYLE_VIEW_MODE : STYLE_HIDDEN;
        } else {
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

    }, [dbGeofences, activeShapeState, getFeatureStyle]);


    return (
       <div ref={mapContainerRef} className="w-full h-full" />
    );
};

export default OpenLayersMap;
