
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  Undo,
  Redo,
  Locate,
  Pin,
  ZoomIn,
  ZoomOut,
  Frame,
  Settings,
  Building,
  Loader,
} from 'lucide-react';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MapComponent, { AdvancedMarker } from '@/components/map';
import { GeofenceControls, type DrawingMode } from './map/geofence-controls';
import { ElementsControls } from './map/elements-controls';
import { getGeofencesByCondoId, getMapElementTypes } from '@/actions/maps';
import type { Geofence } from '@/actions/maps';
import { geocodeAddress } from '@/actions/geocoding';
import { Label } from '@/components/ui/label';
import { MapSettingsDialog } from './map/map-settings-dialog';

export type GeofenceObject = {
    id: string;
    name: string;
    shape: google.maps.MVCObject;
};

export const EDIT_COLOR = { fillColor: '#3498db', strokeColor: '#2980b9' };
export const SAVED_COLOR = { fillColor: '#1ABC9C', strokeColor: '#16A085' };
export const VIEW_ALL_COLOR = { fillColor: '#95a5a6', strokeColor: '#7f8c8d' };
export const DEFAULT_COLOR = { fillColor: '#f39c12', strokeColor: '#e67e22', fillOpacity: 0 };


export const getGeometryFromShape = (shape: google.maps.MVCObject | null): any | null => {
    if (!shape) return null;
    
    if ('getRadius' in shape) {
        return { type: 'circle', center: (shape as google.maps.Circle).getCenter()?.toJSON(), radius: (shape as google.maps.Circle).getRadius() };
    }
    if ('getPaths' in shape) {
        const path = (shape as google.maps.Polygon).getPath();
        return { type: 'polygon', paths: path.getArray().map((latLng: google.maps.LatLng) => ({ lat: latLng.lat(), lng: latLng.lng() })) };
    }
    if ('getBounds' in shape) {
        return { type: 'rectangle', bounds: (shape as google.maps.Rectangle).getBounds()?.toJSON() };
    }
    
    return null;
};

export const createShapeFromGeometry = (geometry: any): google.maps.MVCObject | null => {
    if (!geometry || typeof google === 'undefined') return null;
    
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

const getBoundsOfShape = (shape: google.maps.MVCObject): google.maps.LatLngBounds | null => {
    if ('getBounds' in shape) return (shape as google.maps.Rectangle | google.maps.Circle).getBounds();
    if ('getPaths' in shape) {
        const bounds = new google.maps.LatLngBounds();
        // @ts-ignore
        (shape as google.maps.Polygon).getPath().forEach(latlng => bounds.extend(latlng));
        return bounds;
    }
    return null;
}

const getCenterOfShape = (shape: google.maps.MVCObject): google.maps.LatLng | null => {
    const bounds = getBoundsOfShape(shape);
    return bounds ? bounds.getCenter() : null;
}

export default function CondoMapTab({ condo }: { condo: Condominio }) {
  const { t } = useLocale();
  const map = useMap();

  const [geofences, setGeofences] = useState<GeofenceObject[]>([]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [activeOverlay, setActiveOverlay] = useState<google.maps.MVCObject | null>(null);
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [activeModule, setActiveModule] = useState('geofence');
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
  
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(15);
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [calculatedZoomLevels, setCalculatedZoomLevels] = useState<{ tight: number, normal: number, wide: number } | null>(null);
  const [condoAddressPosition, setCondoAddressPosition] = useState<{ lat: number, lng: number } | null>(null);

  const isEditingShape = isEditing || isCreating;
  
    const centerMapOnGeofence = useCallback((level: '1' | '2' | '3', geofence?: GeofenceObject) => {
        if (!map) return;
        
        const geofenceToCenter = geofence || geofences.find(g => g.id === defaultGeofenceId);
        if (!geofenceToCenter?.shape) return;

        const bounds = getBoundsOfShape(geofenceToCenter.shape);
        if (!bounds) return;

        map.fitBounds(bounds, 0);

        const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
            const maxZoom = map.getZoom();
            if (maxZoom !== undefined) {
                 const zoomLevels = {
                    tight: maxZoom,
                    normal: maxZoom - 1,
                    wide: maxZoom - 2
                };
                setCalculatedZoomLevels(zoomLevels);
                
                let zoomToSet = zoomLevels.normal;
                if (level === '1') zoomToSet = zoomLevels.tight;
                if (level === '3') zoomToSet = zoomLevels.wide;
                
                map.setZoom(zoomToSet);
            }
        });
    }, [map, geofences, defaultGeofenceId]);

   const centerMapOnAddress = useCallback((coords: {lat: number, lng: number}) => {
    if(!map) return;
    map.setCenter(coords);
    map.setZoom(15);
  }, [map]);

  const applyZoomLevel = useCallback((level: '1' | '2' | '3') => {
      if (!map) return;

      if (calculatedZoomLevels) {
          if (level === '1') map.setZoom(calculatedZoomLevels.tight);
          if (level === '2') map.setZoom(calculatedZoomLevels.normal);
          if (level === '3') map.setZoom(calculatedZoomLevels.wide);
      } else {
        centerMapOnGeofence(level);
      }
  }, [map, calculatedZoomLevels, centerMapOnGeofence]);

  useEffect(() => {
    if (!map || !condo.id) return;

    const initializeMap = async () => {
        setIsLoading(true);
        try {
            const dbGeofences = await getGeofencesByCondoId(condo.id);
            const hasGeofences = dbGeofences && dbGeofences.length > 0;
            
            if (hasGeofences) {
                const gfObjects = dbGeofences.map(dbGf => ({
                    id: dbGf.id,
                    name: dbGf.name,
                    shape: createShapeFromGeometry(dbGf.geometry) as google.maps.MVCObject
                }));
                
                const defaultGfDb = dbGeofences.find(g => g.is_default);
                const initialDefaultId = defaultGfDb ? defaultGfDb.id : (gfObjects[0]?.id || null);
                
                setGeofences(gfObjects);
                setDefaultGeofenceId(initialDefaultId);
                setSelectedGeofenceId(initialDefaultId);
                
                const defaultGfObj = gfObjects.find(g => g.id === initialDefaultId);
                if (defaultGfObj?.shape) {
                    const shapeCenter = getCenterOfShape(defaultGfObj.shape);
                    if (shapeCenter) {
                         map.setCenter(shapeCenter.toJSON());
                    }
                    centerMapOnGeofence(fitLevel, defaultGfObj);
                }

            } else {
                const geoResult = await geocodeAddress({
                    street: condo.street,
                    city: condo.city,
                    state: condo.state,
                    country: condo.country,
                });
                
                if (geoResult.success && geoResult.data && geoResult.data.length > 0) {
                    setCondoAddressPosition(geoResult.data[0].geometry.location);
                    centerMapOnAddress(geoResult.data[0].geometry.location);
                } else {
                    const fallbackCenter = { lat: -23.5505, lng: -46.6333 };
                    setCondoAddressPosition(fallbackCenter);
                    centerMapOnAddress(fallbackCenter);
                }
            }
        } catch (error) {
            console.error("Failed to initialize map:", error);
            const fallbackCenter = { lat: -23.5505, lng: -46.6333 };
             setCondoAddressPosition(fallbackCenter);
            centerMapOnAddress(fallbackCenter);
        } finally {
            setIsLoading(false);
        }
    };
    
    initializeMap();

  }, [map, condo.id, fitLevel, condo.street, condo.city, condo.state, condo.country, centerMapOnAddress, centerMapOnGeofence]);
  
  useEffect(() => {
      if (!map) return;
      const listener = map.addListener('zoom_changed', () => {
          const currentZoom = map.getZoom();
          if (currentZoom) {
            setZoomLevel(currentZoom);
          }
      });
      return () => listener.remove();
  }, [map]);


  const updateHistory = useCallback((geometry: any) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(geometry);
    historyRef.current = newHistory;
    historyIndexRef.current++;
    
    setCanUndo(true);
    setCanRedo(false);
  }, []);
  
  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    historyIndexRef.current--;
    const previousGeometry = historyRef.current[historyIndexRef.current];
    const newShape = createShapeFromGeometry(previousGeometry);
    
    if (newShape) {
        // @ts-ignore
        if(activeOverlay) activeOverlay.setMap(null);
        setActiveOverlay(newShape);
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [canUndo, activeOverlay]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    
    historyIndexRef.current++;
    const nextGeometry = historyRef.current[historyIndexRef.current];
    const newShape = createShapeFromGeometry(nextGeometry);
    
    if (newShape) {
        // @ts-ignore
        if(activeOverlay) activeOverlay.setMap(null);
        setActiveOverlay(newShape);
    }

    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [canRedo, activeOverlay]);
  
  const overlayListeners = useRef<google.maps.MapsEventListener[]>([]);
  const clearListeners = useCallback(() => {
    overlayListeners.current.forEach(l => l.remove());
    overlayListeners.current = [];
  }, []);

  const setupListeners = useCallback((shape: google.maps.MVCObject) => {
    clearListeners();
    const updateAndRecordHistory = () => {
        const newGeometry = getGeometryFromShape(shape);
        if (newGeometry) {
            updateHistory(newGeometry);
        }
    };
    
    let changedEvent = 'bounds_changed';
    // @ts-ignore
    if ('getRadius' in shape) changedEvent = 'radius_changed';
    // @ts-ignore
    if ('getPaths' in shape) {
        // @ts-ignore
        const path = shape.getPath();
        overlayListeners.current.push(google.maps.event.addListener(path, 'set_at', updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(path, 'insert_at', updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(path, 'remove_at', updateAndRecordHistory));
    } else {
        overlayListeners.current.push(google.maps.event.addListener(shape, changedEvent, updateAndRecordHistory));
    }
    overlayListeners.current.push(google.maps.event.addListener(shape, 'dragend', updateAndRecordHistory));
  }, [updateHistory, clearListeners]);

  useEffect(() => {
    return () => {
        clearListeners();
        if (activeOverlay) { // @ts-ignore
             activeOverlay.setMap(null);
        }
    }
  }, [clearListeners, activeOverlay]);

  useEffect(() => {
    geofences.forEach(gf => { if (gf.shape) { (gf.shape as any).setMap(null); } });
    if (activeOverlay) { (activeOverlay as any).setMap(null); }
    clearListeners();
    
    if (isEditingShape && activeOverlay) {
        (activeOverlay as any).setOptions({ ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, editable: true, draggable: true, zIndex: 2, suppressUndo: true });
        (activeOverlay as any).setMap(map);
        setupListeners(activeOverlay);
    } else if (isEditingEnabled) {
        const refGeofence = geofences.find(g => g.id === selectedGeofenceId);
        if (refGeofence?.shape) {
            const isDefault = refGeofence.id === defaultGeofenceId;
            (refGeofence.shape as any).setOptions({
                ...(isDefault ? DEFAULT_COLOR : SAVED_COLOR),
                fillOpacity: isDefault ? 0 : 0.1, 
                strokeWeight: 2,
                strokeDasharray: '5,5',
                zIndex: 1, 
                editable: false,
                draggable: false,
            });
            (refGeofence.shape as any).setMap(map);
        }
    } else {
        geofences.forEach(gf => {
            if (!gf.shape) return;
            const isDefault = gf.id === defaultGeofenceId;
            const isSelected = gf.id === selectedGeofenceId;
            let visible = false;
            let options: any = { editable: false, draggable: false };
            
            if (viewAll) {
                visible = true;
                options = {
                    fillColor: isDefault ? DEFAULT_COLOR.fillColor : VIEW_ALL_COLOR.fillColor,
                    strokeColor: isDefault ? DEFAULT_COLOR.strokeColor : VIEW_ALL_COLOR.strokeColor,
                    fillOpacity: isDefault ? 0 : 0.2, 
                    strokeWeight: isDefault ? 3 : 1,
                    zIndex: isDefault ? 2 : 1
                };
            } else if (isSelected) {
                visible = true;
                options = { ...(isDefault ? DEFAULT_COLOR : SAVED_COLOR), fillOpacity: isDefault ? 0: 0.3, strokeWeight: 2, zIndex: 1 };
            }
            // @ts-ignore
            gf.shape.setOptions({ ...options, map: visible ? map : null });
        });
    }
  }, [activeOverlay, isEditing, isEditingShape, map, geofences, isEditingEnabled, viewAll, selectedGeofenceId, defaultGeofenceId, setupListeners, clearListeners]);
  
  const handleZoomIn = () => map && map.setZoom(map.getZoom()! + 1);
  const handleZoomOut = () => map && map.setZoom(map.getZoom()! - 1);
  
  return (
    <>
        <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.map.description')}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="flex h-[70vh]">
                <div className="flex-1 relative w-2/3 p-1">
                     <div className="relative h-full w-full bg-muted overflow-hidden shadow-inner rounded-md border">
                        <MapComponent center={condoAddressPosition || { lat: 0, lng: 0 }} zoom={15}>
                            {isDrawing && (
                                <GeofenceControls.DrawingManager
                                    drawingMode={drawingMode}
                                    onOverlayComplete={(overlay: google.maps.MVCObject) => {
                                        setIsDrawing(false);
                                        setIsCreating(true);
                                        setActiveOverlay(overlay);
                                        updateHistory(getGeometryFromShape(overlay));
                                    }}
                                />
                            )}
                            {condoAddressPosition && 
                                <AdvancedMarker position={condoAddressPosition} title={condo.name}>
                                    <div className="p-1.5 bg-background rounded-full shadow-lg border-2 border-primary">
                                        <Building className="h-5 w-5 text-primary" />
                                    </div>
                                </AdvancedMarker>
                            }
                        </MapComponent>
                         {isLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader className="h-5 w-5 animate-spin" />
                                    <span>{t('condoDashboard.map.loadingMap')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex flex-col items-center gap-1 backdrop-blur-sm">
                        <Button onClick={handleZoomIn} variant="ghost" size="icon" title="Zoom In">
                            <ZoomIn className="h-5 w-5" />
                        </Button>
                        <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                        <Button onClick={handleZoomOut} variant="ghost" size="icon" title="Zoom Out">
                            <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button onClick={() => centerMapOnGeofence(fitLevel)} variant="ghost" size="icon" title={t('condoDashboard.map.geofence.fitBounds')} disabled={!defaultGeofenceId}>
                            <Frame className="h-5 w-5" />
                        </Button>
                    </div>
                    {isEditingShape && (canUndo || canRedo) && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex gap-1 backdrop-blur-sm">
                            <Button onClick={handleUndo} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canUndo}>
                                <Undo className="h-4 w-4"/>
                                {t('condoDashboard.map.undo')}
                            </Button>
                            <Button onClick={handleRedo} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canRedo}>
                                <Redo className="h-4 w-4"/>
                                {t('condoDashboard.map.redo')}
                            </Button>
                        </div>
                    )}
                </div>
                <div className="w-1/3 p-1">
                    <div className="relative border h-full p-4 pt-2 bg-card rounded-md flex flex-col">
                        <h2 className="text-lg font-semibold tracking-tight px-2 absolute -top-3.5 left-4 bg-card">{t('condoDashboard.map.modules.title')}</h2>
                        <div className="border-b pb-4">
                            <Label>{t('adminDashboard.newCondoDialog.addressLabel')}</Label>
                            <div className="flex items-start gap-2 mt-1">
                                <Pin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <p className="text-sm text-muted-foreground">{condo.address}</p>
                            </div>
                             <Button onClick={() => condoAddressPosition && centerMapOnAddress(condoAddressPosition)} variant="outline" size="sm" className="mt-2">
                                <Locate className="mr-2 h-4 w-4"/>
                                {t('condoDashboard.map.recenterOnAddress')}
                            </Button>
                        </div>
                        <div className="flex-1 flex flex-col space-y-4 pt-4">
                            <div className="px-1 flex items-center gap-2">
                                <Select value={activeModule} onValueChange={setActiveModule}>
                                    <SelectTrigger id="module-select" className="text-base font-bold text-primary">
                                        <SelectValue placeholder={t('condoDashboard.map.modules.selectPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="geofence">{t('condoDashboard.map.modules.geofence')}</SelectItem>
                                        <SelectItem value="elements">{t('condoDashboard.map.modules.elements')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                 <Button variant="outline" size="icon" onClick={() => setIsMapSettingsOpen(true)}>
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                            {activeModule === 'geofence' && (
                                <GeofenceControls
                                    condoId={condo.id}
                                    geofences={geofences}
                                    setGeofences={setGeofences}
                                    selectedGeofenceId={selectedGeofenceId}
                                    setSelectedGeofenceId={setSelectedGeofenceId}
                                    defaultGeofenceId={defaultGeofenceId}
                                    setDefaultGeofenceId={setDefaultGeofenceId}
                                    isDrawing={isDrawing}
                                    setIsDrawing={setIsDrawing}
                                    isEditing={isEditing}
                                    setIsEditing={setIsEditing}
                                    isCreating={isCreating}
                                    setIsCreating={setIsCreating}
                                    activeOverlay={activeOverlay}
                                    setActiveOverlay={setActiveOverlay}
                                    updateHistory={updateHistory}
                                    historyRef={historyRef}
                                    historyIndexRef={historyIndexRef}
                                    setCanUndo={setCanUndo}
                                    setCanRedo={setCanRedo}
                                    clearListeners={clearListeners}
                                    map={map}
                                    drawingMode={drawingMode}
                                    setDrawingMode={setDrawingMode}
                                    isEditingEnabled={isEditingEnabled}
                                    setIsEditingEnabled={setIsEditingEnabled}
                                    viewAll={viewAll}
                                    setViewAll={setViewAll}
                                />
                            )}
                            {activeModule === 'elements' && (
                            <ElementsControls condoId={condo.id} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
        </Card>
        <MapSettingsDialog
            isOpen={isMapSettingsOpen}
            onOpenChange={setIsMapSettingsOpen}
            zoomLevel={zoomLevel}
            initialFitLevel={fitLevel}
            onFitLevelChange={setFitLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onApplyFit={applyZoomLevel}
            isGeofenceAvailable={!!calculatedZoomLevels}
        />
    </>
  );
}
