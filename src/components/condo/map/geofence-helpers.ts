

// --- Style Definitions ---
export const STYLE_FOCUSED_BLUE = { fillColor: 'hsl(210 80% 50%)', strokeColor: 'hsl(210 80% 50%)', fillOpacity: 0.2, strokeWeight: 2, editable: true, draggable: true };
export const STYLE_REFERENCE_GREEN = { fillColor: 'hsl(142 71% 45%)', strokeColor: 'hsl(142 71% 45%)', fillOpacity: 0.2, strokeWeight: 2, editable: false, draggable: false };
export const STYLE_BACKGROUND_GREY = { fillColor: '#808080', strokeColor: '#808080', fillOpacity: 0.1, strokeWeight: 1, editable: false, draggable: false };
export const STYLE_VIEW_MODE = { fillOpacity: 0.0, strokeColor: 'hsl(210 80% 50%)', strokeWeight: 2, editable: false, draggable: false };


export const getGeometryFromShape = (shape: google.maps.MVCObject | null): any | null => {
    if (!shape) return null;
    
    if ('getRadius' in shape && typeof (shape as any).getRadius === 'function') {
        const circle = shape as google.maps.Circle;
        return { type: 'circle', center: circle.getCenter()?.toJSON(), radius: circle.getRadius() };
    }
    if ('getPath' in shape && typeof (shape as any).getPath === 'function') {
        const path = (shape as google.maps.Polygon).getPath();
        return { type: 'polygon', paths: path.getArray().map((latLng: google.maps.LatLng) => latLng.toJSON()) };
    }
    if ('getBounds' in shape && typeof (shape as any).getBounds === 'function') {
        const rectangle = shape as google.maps.Rectangle;
        return { type: 'rectangle', bounds: rectangle.getBounds()?.toJSON() };
    }
    
    return null;
};

export const createShapeFromGeometry = (geometry: any): google.maps.MVCObject | null => {
    if (!geometry || typeof google === 'undefined' || !google.maps) return null;
    
    let shape: google.maps.MVCObject | null = null;
    
    if (geometry.type === 'polygon' && Array.isArray(geometry.paths)) {
        shape = new google.maps.Polygon({ paths: geometry.paths });
    } else if (geometry.type === 'rectangle' && geometry.bounds) {
        shape = new google.maps.Rectangle({ bounds: geometry.bounds });
    } else if (geometry.type === 'circle' && geometry.center && geometry.radius) {
        shape = new google.maps.Circle({ center: geometry.center, radius: geometry.radius });
    }
    return shape;
};

export const restoreShapeToGeometry = (shape: google.maps.MVCObject, geometry: any) => {
    if (!geometry || !shape) return;

    if (geometry.type === 'polygon' && 'setPath' in shape) {
        (shape as google.maps.Polygon).setPath(geometry.paths);
    } else if (geometry.type === 'rectangle' && 'setBounds' in shape) {
        (shape as google.maps.Rectangle).setOptions({ bounds: geometry.bounds });
    } else if (geometry.type === 'circle' && 'getCenter' in shape && 'getRadius' in shape) {
        (shape as google.maps.Circle).setOptions({ center: geometry.center, radius: geometry.radius });
    }
};


export const getBoundsOfShape = (shape: google.maps.MVCObject | null): google.maps.LatLngBounds | null => {
    if (!shape) return null;
    if ('getBounds' in shape && typeof (shape as any).getBounds === 'function') { // Rectangle, Circle
        const bounds = (shape as any).getBounds();
        if (!bounds) return null;
        return new google.maps.LatLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
    }
    if ('getPath' in shape && typeof (shape as any).getPath === 'function') { // Polygon
        const bounds = new google.maps.LatLngBounds();
        (shape as google.maps.Polygon).getPath().forEach((latlng: google.maps.LatLng) => bounds.extend(latlng));
        return bounds;
    }
    return null;
}

export const getCenterOfShape = (shape: google.maps.MVCObject | null): google.maps.LatLng | null => {
    if (!shape) return null;
    const bounds = getBoundsOfShape(shape);
    return bounds ? bounds.getCenter() : null;
}
