
import { isEqual, debounce } from 'lodash';

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

export const getGeometryFromShape = (shape: google.maps.MVCObject): any => {
    if (shape instanceof google.maps.Polygon) {
        const path = shape.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
        return { type: 'Polygon', path };
    }
    if (shape instanceof google.maps.Rectangle) {
        const bounds = shape.getBounds();
        if(!bounds) return null;
        return { type: 'Rectangle', bounds: bounds.toJSON() };
    }
    if (shape instanceof google.maps.Circle) {
        return { 
            type: 'Circle', 
            center: shape.getCenter()?.toJSON(),
            radius: shape.getRadius()
        };
    }
    return null;
};

export const createShapeFromGeometry = (geometry: any): google.maps.MVCObject | null => {
    if (!geometry || !geometry.type) return null;

    switch (geometry.type) {
        case 'Polygon':
            return new google.maps.Polygon({ paths: geometry.path });
        case 'Rectangle':
            return new google.maps.Rectangle({ bounds: geometry.bounds });
        case 'Circle':
            return new google.maps.Circle({ center: geometry.center, radius: geometry.radius });
        default:
            return null;
    }
};

export const restoreShapeToGeometry = (shape: google.maps.MVCObject, geometry: any) => {
    if (!geometry) return;

    if (shape instanceof google.maps.Polygon && geometry.type === 'Polygon') {
        shape.setPath(geometry.path);
    } else if (shape instanceof google.maps.Rectangle && geometry.type === 'Rectangle') {
        shape.setBounds(geometry.bounds);
    } else if (shape instanceof google.maps.Circle && geometry.type === 'Circle') {
        shape.setCenter(geometry.center);
        shape.setRadius(geometry.radius);
    }
}


// --- BOUNDS HELPERS ---

export const getBoundsOfShape = (shape: google.maps.MVCObject): google.maps.LatLngBounds | null => {
  if (shape instanceof google.maps.Polygon) {
    const bounds = new google.maps.LatLngBounds();
    shape.getPath().forEach(latLng => bounds.extend(latLng));
    return bounds;
  }
  if (shape instanceof google.maps.Rectangle) {
    return shape.getBounds();
  }
  if (shape instanceof google.maps.Circle) {
    return shape.getBounds();
  }
  return null;
};

export const getCenterOfShape = (shape: google.maps.MVCObject): google.maps.LatLng | null => {
    const bounds = getBoundsOfShape(shape);
    return bounds ? bounds.getCenter() : null;
};

// --- MISC ---

export const getGeofenceName = (gf: DbGeofence, isDefault: boolean, t: (key: string) => string) => {
  return `${gf.name}${isDefault ? ` (${t('common.default')})` : ''}`;
};
