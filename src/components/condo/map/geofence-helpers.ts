

import { fromCircle } from 'ol/geom/Polygon';
import type { Map as OlMap } from 'ol';
import type Feature from 'ol/Feature';
import { Draw, Modify, Select } from 'ol/interaction';
import GeoJSON from 'ol/format/GeoJSON';
import { getArea } from 'ol/sphere';
import type { Circle, Polygon } from 'ol/geom';


// --- STYLES ---

export const STYLE_BACKGROUND_GREY = {
  strokeColor: '#808080',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#808080',
  fillOpacity: 0.1,
  clickable: false,
  editable: false,
  zIndex: 1,
};

export const STYLE_VIEW_MODE = {
  strokeColor: '#4A90E2',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#4A90E2',
  fillOpacity: 0.2,
  clickable: false,
  editable: false,
  zIndex: 2,
};

export const STYLE_REFERENCE_GREEN = {
  strokeColor: '#34A853',
  strokeOpacity: 0.6,
  strokeWeight: 2,
  fillColor: '#34A853',
  fillOpacity: 0.2,
  clickable: false,
  editable: false,
  zIndex: 1,
};

export const STYLE_FOCUSED_BLUE = {
  strokeColor: '#4A90E2',
  strokeOpacity: 1.0,
  strokeWeight: 3,
  fillColor: '#4A90E2',
  fillOpacity: 0.35,
  clickable: true,
  editable: true,
  draggable: true,
  zIndex: 3,
};


// --- GEOMETRY HELPERS ---

const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });

/**
 * Converts an OpenLayers Feature's geometry into a GeoJSON Geometry object.
 * Rectangles and Circles are converted to Polygons to conform to the GeoJSON standard.
 * @param feature The OpenLayers Feature to process.
 * @returns A GeoJSON Geometry object.
 */
export const getGeometryFromFeature = (feature: Feature): any => {
    let geometry = feature.getGeometry();
    if (!geometry) return null;

    // For circles, convert them to a polygon approximation first.
    if (geometry.getType() === 'Circle') {
        geometry = fromCircle(geometry as Circle);
    }
    
    return geojsonFormat.writeGeometryObject(geometry);
};

/**
 * Creates an OpenLayers Feature from a GeoJSON geometry object.
 * It handles standard GeoJSON types and custom legacy types ('Rectangle', 'Circle').
 * @param geometry The GeoJSON geometry object from the database.
 * @returns An OpenLayers Feature or null.
 */
export const createFeatureFromGeometry = (geometry: any): Feature | null => {
    if (!geometry) return null;

    let olGeometry;
    const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
    
    // Handle legacy, non-standard geometry types
    if (geometry.type === 'Rectangle' && geometry.bounds) {
        const { south, west, north, east } = geometry.bounds;
        const coordinates = [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south]
        ]];
        olGeometry = format.readGeometry({ type: 'Polygon', coordinates });
    } else if (geometry.type === 'Circle' && geometry.center && geometry.radius) {
        const centerCoords = [geometry.center.lng, geometry.center.lat];
        const circleGeom = new ol.geom.Circle(fromLonLat(centerCoords), geometry.radius);
        olGeometry = fromCircle(circleGeom); // Convert to polygon
    } else {
        // Handle standard GeoJSON types
        try {
            olGeometry = format.readGeometry(geometry);
        } catch (e) {
            console.error("Error reading standard GeoJSON geometry:", e);
            return null;
        }
    }
    
    return olGeometry ? new Feature({ geometry: olGeometry }) : null;
};
