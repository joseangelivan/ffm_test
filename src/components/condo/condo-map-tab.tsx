

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import {
  Locate,
  Pin,
  ZoomIn,
  ZoomOut,
  Frame,
  Building,
  Loader,
  Undo,
  Redo,
} from 'lucide-react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { isEqual, debounce } from 'lodash';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from '@/lib/i18n';
import MapComponent, { AdvancedMarker } from '@/components/map';
import { GeofenceControls } from './map/geofence-controls';
import { ElementsControls } from './map/elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map/map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export const EDIT_COLOR = { fillColor: '#2ECC71', strokeColor: '#27AE60', strokeWeight: 2, editable: true, draggable: true };
export const SAVED_COLOR = { fillColor: '#3498db', strokeColor: '#2980b9', strokeWeight: 2, editable: false, draggable: false, clickable: true };
export const VIEW_ALL_COLOR = { fillColor: '#95a5a6', strokeColor: '#7f8c8d', strokeWeight: 1, editable: false, draggable: false, clickable: false };
export const DEFAULT_COLOR = { fillColor: 'hsl(28 80% 50%)', fillOpacity: 0, strokeColor: 'hsl(28 80% 50%)', strokeWeight: 3, editable: false, draggable: false, clickable: true };


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

const getBoundsOfShape = (shape: google.maps.MVCObject | null): google.maps.LatLngBounds | null => {
    if (!shape) return null;
    if ('getBounds' in shape && typeof (shape as any).getBounds === 'function') {
        const bounds = (shape as any).getBounds();
        return bounds ? new google.maps.LatLngBounds(bounds) : null;
    }
    if ('getPath' in shape && typeof (shape as any).getPath === 'function') { // Polygons have getPath()
        const bounds = new google.maps.LatLngBounds();
        (shape as google.maps.Polygon).getPath().forEach((latlng: google.maps.LatLng) => bounds.extend(latlng));
        return bounds;
    }
    return null;
}

const getCenterOfShape = (shape: google.maps.MVCObject | null): google.maps.LatLng | null => {
    if (!shape) return null;
    const bounds = getBoundsOfShape(shape);
    return bounds ? bounds.getCenter() : null;
}

interface MapInnerProps {
  condo: Condominio;
  initialPosition: { lat: number; lng: number };
  onMapLoad: (map: google.maps.Map) => void;
  drawingManagerRef: React.MutableRefObject<google.maps.drawing.DrawingManager | null>;
}

const DrawingManagerComponent = ({
  drawingManagerRef,
}: {
  drawingManagerRef: React.MutableRefObject<google.maps.drawing.DrawingManager | null>;
}) => {
  const map = useMap();
  const drawingLibrary = useMapsLibrary('drawing');

  useEffect(() => {
    if (!drawingLibrary || !map) return;

    const newDrawingManager = new drawingLibrary.DrawingManager({
      drawingControl: false,
      polygonOptions: { ...EDIT_COLOR },
      rectangleOptions: { ...EDIT_COLOR },
      circleOptions: { ...EDIT_COLOR },
    });

    drawingManagerRef.current = newDrawingManager;
    newDrawingManager.setMap(map);

    return () => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }
    };
  }, [drawingLibrary, drawingManagerRef, map]);

  return null;
};

function MapInner({ condo, initialPosition, onMapLoad, drawingManagerRef }: MapInnerProps) {
  return (
    <MapComponent onMapLoad={onMapLoad}>
        <DrawingManagerComponent drawingManagerRef={drawingManagerRef} />
        {initialPosition && (
            <AdvancedMarker position={initialPosition} title={condo.name}>
                <Building className="h-8 w-8 text-slate-700 drop-shadow-lg" />
            </AdvancedMarker>
        )}
    </MapComponent>
  );
}


export default function CondoMapTab({ condo, initialPosition }: { condo: Condominio, initialPosition: { lat: number; lng: number } }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>([]);
  const [mapShapes, setMapShapes] = useState<Map<string, google.maps.MVCObject>>(new Map());

  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'view' | 'editing' | 'drawing'>('view');
  
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const [showAllGeofences, setShowAllGeofences] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(15);
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(true);

  const [calculatedZoomLevels, setCalculatedZoomLevels] = useState<{ tight: number, normal: number, wide: number } | null>(null);
  
  const [condoAddressPosition] = useState(initialPosition);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);

  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [selectedModule, setSelectedModule] = useState('geofence');
  const activeShapeRef = useRef<{ id: string, shape: google.maps.MVCObject } | null>(null);
  const originalGeometries = useRef<Map<string, any>>(new Map());
  
   const onDataNeedsRefresh = useCallback(async (newSelectedId?: string) => {
    setIsLoading(true);
    try {
        const freshDbGeofences = await getGeofencesByCondoId(condo.id);
        setDbGeofences(freshDbGeofences);

        const newMapShapes = new Map<string, google.maps.MVCObject>();
        const newOriginalGeometries = new Map<string, any>();

        for (const dbGf of freshDbGeofences) {
            const shape = createShapeFromGeometry(dbGf.geometry);
            if (shape) {
                newMapShapes.set(dbGf.id, shape);
                newOriginalGeometries.set(dbGf.id, dbGf.geometry);
            }
        }
        setMapShapes(newMapShapes);
        originalGeometries.current = newOriginalGeometries;
        
        const defaultGfDb = freshDbGeofences.find(g => g.is_default);
        const newDefaultId = defaultGfDb ? defaultGfDb.id : (freshDbGeofences.length > 0 ? freshDbGeofences[0].id : null);
        setDefaultGeofenceId(newDefaultId);
        
        if (newSelectedId) {
            setSelectedGeofenceId(newSelectedId);
        } else {
            const currentSelectionExists = freshDbGeofences.some(g => g.id === selectedGeofenceId);
            if (!currentSelectionExists) {
                setSelectedGeofenceId(newDefaultId);
            }
        }
    } catch (e) {
        console.error("Failed to refresh data", e);
        toast({ title: t('toast.errorTitle'), description: "Error al recargar los datos del mapa.", variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [condo.id, selectedGeofenceId, toast, t]);


  const centerMapOnAddress = useCallback(() => {
    const map = mapRef.current;
    if(!map || !condoAddressPosition) return;
    map.setCenter(condoAddressPosition);
    map.setZoom(17);
  }, [condoAddressPosition]);


  const recalculateZoomLevels = useCallback(() => {
      const map = mapRef.current;
      const geofenceToCenter = dbGeofences.find(g => g.id === defaultGeofenceId);
      if (!map || !geofenceToCenter || !mapShapes) return;

      const shape = mapShapes.get(geofenceToCenter.id);
      if (!shape) return;

      const bounds = getBoundsOfShape(shape);
      if (bounds) {
          map.fitBounds(bounds, 0);
          const maxZoom = map.getZoom();

          if (maxZoom !== undefined) {
              const newLevels = {
                  tight: maxZoom,
                  normal: maxZoom > 1 ? maxZoom - 1 : maxZoom,
                  wide: maxZoom > 2 ? maxZoom - 2 : maxZoom,
              };
              setCalculatedZoomLevels(newLevels);
              
              let zoomToSet = newLevels.normal;
              if (fitLevel === '1') zoomToSet = newLevels.tight;
              if (fitLevel === '3') zoomToSet = newLevels.wide;
              
              map.setZoom(zoomToSet);
          }
      }
  }, [dbGeofences, defaultGeofenceId, fitLevel, mapShapes]);


  const applyZoomLevel = useCallback((level: '1' | '2' | '3') => {
    const map = mapRef.current;
    if (!map || !calculatedZoomLevels || !mapShapes) return;
    
    const geofenceToCenter = dbGeofences.find(g => g.id === defaultGeofenceId);
    if(geofenceToCenter) {
        const shape = mapShapes.get(geofenceToCenter.id);
        if(shape) {
            const center = getCenterOfShape(shape);
            if (center) map.setCenter(center);
        }
    }
    
    let zoomToSet = calculatedZoomLevels.normal;
    if (level === '1') zoomToSet = calculatedZoomLevels.tight;
    if (level === '3') zoomToSet = calculatedZoomLevels.wide;
    
    if (map.getZoom() !== zoomToSet) {
      map.setZoom(zoomToSet);
    }
    
    setFitLevel(level);
  }, [calculatedZoomLevels, dbGeofences, defaultGeofenceId, mapShapes]);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    const observer = new ResizeObserver(() => {
        setTimeout(() => {
            if (!mapRef.current) return;
            recalculateZoomLevels();
        }, 0);
    });
    
    observer.observe(mapContainer);

    return () => {
        observer.disconnect();
    };
  }, [recalculateZoomLevels]);


  useEffect(() => {
    if (!mapRef.current) return;
    const zoomListener = mapRef.current.addListener('zoom_changed', () => {
      const currentZoom = mapRef.current?.getZoom();
      if (currentZoom) setZoomLevel(currentZoom);
    });
    return () => { zoomListener.remove(); };
  }, []);
  
  const overlayListeners = useRef<google.maps.MapsEventListener[]>([]);
  const vertexChanged = useRef(false);

  const clearListeners = useCallback(() => {
    overlayListeners.current.forEach(l => l.remove());
    overlayListeners.current = [];
  }, []);

  const updateHistoryButtons = useCallback(() => {
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);
  
  const handleHistoryUpdate = useCallback((shape: google.maps.MVCObject | null) => {
    if (!shape) return;

    const newGeometry = getGeometryFromShape(shape);
    const lastGeometry = historyRef.current[historyIndexRef.current];
    
    if (isEqual(newGeometry, lastGeometry)) {
        return;
    }

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newGeometry);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    updateHistoryButtons();
  }, [updateHistoryButtons]);


    
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    const setupListeners = (shape: google.maps.MVCObject) => {
        clearListeners();
        const listeners: google.maps.MapsEventListener[] = [];
        const event = google.maps.event;

        listeners.push(event.addListener(shape, 'dragend', () => handleHistoryUpdate(shape)));
        
        const registerVertexChange = () => { vertexChanged.current = true; };
        if ('getPath' in shape) {
            const path = (shape as google.maps.Polygon).getPath();
            listeners.push(event.addListener(path, 'set_at', registerVertexChange));
            listeners.push(event.addListener(path, 'insert_at', registerVertexChange));
            listeners.push(event.addListener(path, 'remove_at', registerVertexChange));
        }
        if ('getRadius' in shape) listeners.push(event.addListener(shape, 'radius_changed', registerVertexChange));
        if ('getBounds' in shape) listeners.push(event.addListener(shape, 'bounds_changed', registerVertexChange));
        
        const mapDiv = map.getDiv();
        const mapMouseUpListener = mapDiv.addEventListener('mouseup', () => {
             if (vertexChanged.current) {
                handleHistoryUpdate(shape);
                vertexChanged.current = false;
            }
        });
        
        overlayListeners.current.push({ remove: () => mapDiv.removeEventListener('mouseup', mapMouseUpListener as any) } as any);
        overlayListeners.current.push(...listeners);
    };
    
    mapShapes.forEach((shape) => (shape as any).setMap(null));
    if (activeShapeRef.current) (activeShapeRef.current.shape as any).setMap(null);
    clearListeners();

    if (mode === 'view') {
        mapShapes.forEach((shape, id) => {
            let isVisible = false;
            let colorOptions: any = {};
            if (isEditingEnabled) {
                if (id === selectedGeofenceId) {
                    isVisible = true;
                    colorOptions = (id === defaultGeofenceId) ? DEFAULT_COLOR : SAVED_COLOR;
                }
            } else {
                if (showAllGeofences) {
                    isVisible = true;
                    colorOptions = id === defaultGeofenceId ? DEFAULT_COLOR : VIEW_ALL_COLOR;
                } else {
                    if (id === defaultGeofenceId) {
                        isVisible = true;
                        colorOptions = DEFAULT_COLOR;
                    }
                }
            }
            (shape as any).setOptions({ ...colorOptions, editable: false, draggable: false });
            if(isVisible) shape.setMap(map);
        });
    } else {
        const refShape = selectedGeofenceId ? mapShapes.get(selectedGeofenceId) : null;
        if(refShape){
            const isDefault = selectedGeofenceId === defaultGeofenceId;
            (refShape as any).setOptions({ ...(isDefault ? DEFAULT_COLOR : SAVED_COLOR), editable: false, draggable: false });
            refShape.setMap(map);
        }

        const activeShape = activeShapeRef.current?.shape;
        if(activeShape) {
            (activeShape as any).setOptions(EDIT_COLOR);
            activeShape.setMap(map);
            setupListeners(activeShape);
        }
    }
  }, [
      mode, selectedGeofenceId, defaultGeofenceId, showAllGeofences,
      mapShapes, clearListeners, isEditingEnabled, isLoading, handleHistoryUpdate
  ]);


  useEffect(() => {
    if (mode === 'editing') {
      updateHistoryButtons();
    }
  }, [mode, updateHistoryButtons]);
  
  const handleZoomIn = () => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom()! + 1);
  const handleZoomOut = () => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom()! - 1);


  const handleMapLoad = useCallback(async (map: google.maps.Map) => {
    mapRef.current = map;
    await onDataNeedsRefresh();
  }, [onDataNeedsRefresh]);

  useEffect(() => {
      if (isLoading || !mapRef.current) return;

      const geofenceToCenter = dbGeofences.find(g => g.is_default);
      
      if (geofenceToCenter) {
           const shape = createShapeFromGeometry(geofenceToCenter.geometry);
           if(shape) {
              const bounds = getBoundsOfShape(shape);
              if (bounds) {
                  google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
                      recalculateZoomLevels();
                  });
                  mapRef.current.fitBounds(bounds, 0);
              } else {
                  centerMapOnAddress();
              }
           } else {
               centerMapOnAddress();
           }
      } else {
          centerMapOnAddress();
      }
  }, [isLoading, dbGeofences, centerMapOnAddress, recalculateZoomLevels]);
    
    
  const handleHistoryAction = (action: 'undo' | 'redo') => {
    if ((action === 'undo' && !canUndo) || (action === 'redo' && !canRedo)) return;

    const newIndex = action === 'undo' ? historyIndexRef.current - 1 : historyIndexRef.current + 1;
    const geometry = historyRef.current[newIndex];
    if (!geometry || !activeShapeRef.current) return;
    
    const shape = activeShapeRef.current.shape;

    if ('setPath' in shape && geometry.type === 'polygon') {
        (shape as google.maps.Polygon).setPath(geometry.paths);
    } else if ('setBounds' in shape && geometry.type === 'rectangle') {
        (shape as google.maps.Rectangle).setBounds(geometry.bounds);
    } else if ('setCenter' in shape && 'setRadius' in shape && geometry.type === 'circle') {
        (shape as google.maps.Circle).setCenter(geometry.center);
        (shape as google.maps.Circle).setRadius(geometry.radius);
    }
    
    historyIndexRef.current = newIndex;
    updateHistoryButtons();
  };
  
  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.map.description')}</CardDescription>
                </div>
                 <div className="text-right">
                    <h3 className="font-semibold">{condo.name}</h3>
                    <p className="text-xs text-muted-foreground">{condo.address}</p>
                    <Button onClick={centerMapOnAddress} variant="link" size="sm" className="p-0 h-auto">
                        <Locate className="h-3 w-3 mr-1" />
                        {t('condoDashboard.map.recenterOnAddress')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 h-[70vh]">
                    <div ref={mapContainerRef} className="col-span-1 md:col-span-2 relative p-1">
                        <div className="relative h-full w-full bg-muted overflow-hidden shadow-inner rounded-md border">
                            {isLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader className="h-5 w-5 animate-spin" />
                                        <span>{t('condoDashboard.map.loadingMap')}</span>
                                    </div>
                                </div>
                            )}
                            <MapInner 
                                condo={condo}
                                initialPosition={initialPosition}
                                onMapLoad={handleMapLoad}
                                drawingManagerRef={drawingManagerRef}
                            />
                        </div>
                         {mode === 'editing' && (canUndo || canRedo) && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex items-center gap-1 backdrop-blur-sm">
                                <Button onClick={() => handleHistoryAction('undo')} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canUndo}>
                                    <Undo className="h-4 w-4"/>
                                    {t('condoDashboard.map.undo')}
                                </Button>
                                <Button onClick={() => handleHistoryAction('redo')} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canRedo}>
                                    <Redo className="h-4 w-4"/>
                                    {t('condoDashboard.map.redo')}
                                </Button>
                            </div>
                         )}
                        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex flex-col items-center gap-1 backdrop-blur-sm">
                            <Button onClick={handleZoomIn} variant="ghost" size="icon" title="Zoom In">
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                            <Button onClick={handleZoomOut} variant="ghost" size="icon" title="Zoom Out">
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <Button onClick={() => applyZoomLevel(fitLevel)} variant="ghost" size="icon" title={t('condoDashboard.map.geofence.fitBounds')} disabled={!defaultGeofenceId}>
                                <Frame className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="col-span-1 p-1 flex flex-col">
                         <fieldset className="border rounded-md p-4 pt-2 flex-grow flex flex-col">
                            <legend className="text-lg font-semibold tracking-tight px-2 -ml-2">
                                {t('condoDashboard.map.modules.title')}
                            </legend>
                             <div className="space-y-2">
                                <Select value={selectedModule} onValueChange={setSelectedModule}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('condoDashboard.map.modules.selectPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="geofence">{t('condoDashboard.map.modules.geofence')}</SelectItem>
                                        <SelectItem value="elements">{t('condoDashboard.map.modules.elements')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedModule === 'geofence' && (
                                <GeofenceControls
                                    condoId={condo.id}
                                    geofences={dbGeofences}
                                    onDataNeedsRefresh={onDataNeedsRefresh}
                                    selectedGeofenceId={selectedGeofenceId}
                                    setSelectedGeofenceId={setSelectedGeofenceId}
                                    defaultGeofenceId={defaultGeofenceId}
                                    setDefaultGeofenceId={setDefaultGeofenceId}
                                    mode={mode}
                                    setMode={setMode}
                                    drawingManager={drawingManagerRef.current}
                                    isEditingEnabled={isEditingEnabled}
                                    setIsEditingEnabled={setIsEditingEnabled}
                                    showAllGeofences={showAllGeofences}
                                    setShowAllGeofences={setShowAllGeofences}
                                    onSettingsClick={() => setIsMapSettingsOpen(true)}
                                    activeShapeRef={activeShapeRef}
                                    historyRef={historyRef}
                                    historyIndexRef={historyIndexRef}
                                    updateHistoryButtons={updateHistoryButtons}
                                    mapShapes={mapShapes}
                                    originalGeometries={originalGeometries.current}
                                />
                            )}
                            {selectedModule === 'elements' && (
                                <ElementsControls condoId={condo.id}/>
                            )}
                        </fieldset>
                    </div>
                </div>
            </CardContent>
        </Card>
        <MapSettingsDialog
            isOpen={isMapSettingsOpen}
            onOpenChange={setIsMapSettingsOpen}
            zoomLevel={zoomLevel}
            initialFitLevel={fitLevel}
            onApplyFit={applyZoomLevel}
            isGeofenceAvailable={!!calculatedZoomLevels}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}
