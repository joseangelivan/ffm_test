
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useMapsLibrary } from '@vis.gl/react-google-maps';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MapComponent, { AdvancedMarker } from '@/components/map';
import { GeofenceControls, type DrawingMode } from './map/geofence-controls';
import { ElementsControls } from './map/elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence } from '@/actions/maps';
import { Label } from '@/components/ui/label';
import { MapSettingsDialog } from './map/map-settings-dialog';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';

export type GeofenceObject = {
    id: string;
    name: string;
    shape: google.maps.MVCObject;
};

export const EDIT_COLOR = { fillColor: '#3498db', strokeColor: '#2980b9', strokeWeight: 2 };
export const SAVED_COLOR = { fillColor: '#2ECC71', strokeColor: '#27AE60', strokeWeight: 2 };
export const VIEW_ALL_COLOR = { fillColor: '#95a5a6', strokeColor: '#7f8c8d', strokeWeight: 1 };
export const DEFAULT_COLOR = { fillColor: 'hsl(28 80% 50% / 0.1)', strokeColor: 'hsl(28 80% 50%)', strokeWeight: 2 };


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

// A new component to manage the DrawingManager lifecycle
const DrawingManagerComponent = ({
  onOverlayComplete,
  drawingManagerRef,
}: {
  onOverlayComplete: (event: google.maps.drawing.OverlayCompleteEvent) => void;
  drawingManagerRef: React.MutableRefObject<google.maps.drawing.DrawingManager | null>;
}) => {
  const drawingLibrary = useMapsLibrary('drawing');

  useEffect(() => {
    if (!drawingLibrary) return;

    const newDrawingManager = new drawingLibrary.DrawingManager({
      drawingControl: false,
      polygonOptions: { ...SAVED_COLOR, draggable: true, editable: true },
      rectangleOptions: { ...SAVED_COLOR, draggable: true, editable: true },
      circleOptions: { ...SAVED_COLOR, draggable: true, editable: true },
    });

    drawingManagerRef.current = newDrawingManager;
    
    const listener = google.maps.event.addListener(
      newDrawingManager,
      'overlaycomplete',
      onOverlayComplete
    );

    return () => {
      listener.remove();
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }
    };
  }, [drawingLibrary, onOverlayComplete, drawingManagerRef]);

  return null;
};


export default function CondoMapTab({ condo, initialPosition }: { condo: Condominio, initialPosition: { lat: number; lng: number } }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  
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
  const [showAllGeofences, setShowAllGeofences] = useState(false);


  const [zoomLevel, setZoomLevel] = useState(15);
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(true);

  const [calculatedZoomLevels, setCalculatedZoomLevels] = useState<{ tight: number, normal: number, wide: number } | null>(null);
  
  const [condoAddressPosition] = useState(initialPosition);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);

  const isEditingShape = isEditing || isCreating;
  
   const onDataNeedsRefresh = useCallback(async () => {
    geofences.forEach(gf => {
        if (gf.shape) {
            (gf.shape as any).setMap(null);
        }
    });

    const dbGeofences = await getGeofencesByCondoId(condo.id);
    const gfObjects = dbGeofences
        .map(dbGf => ({ id: dbGf.id, name: dbGf.name, shape: createShapeFromGeometry(dbGf.geometry) as google.maps.MVCObject }))
        .filter(gf => gf.shape);

    setGeofences(gfObjects);
    const defaultGfDb = dbGeofences.find(g => g.is_default);
    
    const newDefaultId = defaultGfDb ? defaultGfDb.id : (gfObjects.length > 0 ? gfObjects[0].id : null);
    setDefaultGeofenceId(newDefaultId);
    
    const currentSelectionExists = gfObjects.some(g => g.id === selectedGeofenceId);
    if (!currentSelectionExists) {
        setSelectedGeofenceId(newDefaultId);
    }
  }, [condo.id, geofences, selectedGeofenceId]);


  const centerMapOnAddress = useCallback(() => {
    const map = mapRef.current;
    if(!map || !condoAddressPosition) return;
    map.setCenter(condoAddressPosition);
    map.setZoom(17);
  }, [condoAddressPosition]);


  const recalculateZoomLevels = useCallback(() => {
      const map = mapRef.current;
      const geofenceToCenter = geofences.find(g => g.id === defaultGeofenceId);
      if (!map || !geofenceToCenter?.shape) return;

      const bounds = getBoundsOfShape(geofenceToCenter.shape);
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
  }, [geofences, defaultGeofenceId, fitLevel]);


  const applyZoomLevel = useCallback((level: '1' | '2' | '3') => {
    const map = mapRef.current;
    if (!map || !calculatedZoomLevels) return;
    
    const geofenceToCenter = geofences.find(g => g.id === defaultGeofenceId);
    if (geofenceToCenter?.shape) {
        const center = getCenterOfShape(geofenceToCenter.shape);
        if (center) map.setCenter(center);
    }
    
    let zoomToSet = calculatedZoomLevels.normal;
    if (level === '1') zoomToSet = calculatedZoomLevels.tight;
    if (level === '3') zoomToSet = calculatedZoomLevels.wide;
    
    if (map.getZoom() !== zoomToSet) {
      map.setZoom(zoomToSet);
    }
    
    setFitLevel(level);
  }, [calculatedZoomLevels, geofences, defaultGeofenceId]);

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
  }, [mapRef]);
  
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

  // Activate/Deactivate DrawingManager
  useEffect(() => {
    if (drawingManagerRef.current && mapRef.current) {
        drawingManagerRef.current.setMap(mapRef.current);
        if (isDrawing) {
            drawingManagerRef.current.setDrawingMode(drawingMode as any);
        } else {
            drawingManagerRef.current.setDrawingMode(null);
        }
    }
  }, [isDrawing, drawingMode]);

  // Handle drawing completion
  const onOverlayComplete = useCallback((event: google.maps.drawing.OverlayCompleteEvent) => {
      const newOverlay = event.overlay;
      if (newOverlay) {
        newOverlay.setMap(null); // Temporarily hide it
        setIsDrawing(false);
        setActiveOverlay(newOverlay);
        setIsCreating(true);
        updateHistory(getGeometryFromShape(newOverlay));
        toast({ title: t('condoDashboard.map.toast.shapeDrawn.title'), description: t('condoDashboard.map.toast.shapeDrawn.description') });
      }
      if(drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      }
  }, [setIsDrawing, setActiveOverlay, setIsCreating, updateHistory, toast, t]);


  useEffect(() => {
    geofences.forEach(gf => {
        if (gf.shape) gf.shape.setMap(null);
    });

    if (activeOverlay && !isEditingShape) {
        (activeOverlay as any).setMap(null);
    }
  
    clearListeners();

    if (isDrawing) {
        const selectedGeofence = geofences.find(gf => gf.id === selectedGeofenceId);
        if (selectedGeofence && selectedGeofence.shape) {
            (selectedGeofence.shape as any).setOptions({ 
                ...EDIT_COLOR,
                fillOpacity: 0.1, 
                strokeWeight: 1, 
                zIndex: 1, 
                map: mapRef.current,
                editable: false, draggable: false, clickable: false
            });
        }
    } else if (isEditing) {
        const selectedGeofence = geofences.find(gf => gf.id === selectedGeofenceId);
        if (selectedGeofence && selectedGeofence.shape) {
            (selectedGeofence.shape as any).setOptions({ 
                ...EDIT_COLOR,
                fillOpacity: 0.1, 
                strokeWeight: 1, 
                zIndex: 1, 
                map: mapRef.current,
                editable: false, draggable: false, clickable: false
            });
        }
    } else {
        geofences.forEach(gf => {
            const isDefault = gf.id === defaultGeofenceId;
            let isVisible = false;

            if (isEditingEnabled) {
                isVisible = gf.id === selectedGeofenceId;
            } else {
                isVisible = showAllGeofences || isDefault;
            }

            if (isVisible && gf.shape) {
                let colorOptions;
                if (isDefault) {
                    colorOptions = DEFAULT_COLOR;
                } else if (showAllGeofences) {
                    colorOptions = VIEW_ALL_COLOR;
                } else if(isEditingEnabled && gf.id === selectedGeofenceId) {
                    colorOptions = EDIT_COLOR;
                } else {
                    colorOptions = SAVED_COLOR;
                }

                (gf.shape as any).setOptions({
                    ...colorOptions,
                    map: mapRef.current,
                    editable: false, draggable: false, clickable: false
                });
            }
        });
    }
  
    if (isEditingShape && activeOverlay) {
        (activeOverlay as any).setOptions({ ...SAVED_COLOR, editable: true, draggable: true, zIndex: 3 });
        (activeOverlay as any).setMap(mapRef.current);
        setupListeners(activeOverlay);
    }
  
  }, [activeOverlay, isEditingShape, isDrawing, isEditing, selectedGeofenceId, defaultGeofenceId, setupListeners, clearListeners, geofences, isEditingEnabled, showAllGeofences]);
  
  const handleZoomIn = () => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom()! + 1);
  const handleZoomOut = () => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom()! - 1);


  const handleMapLoad = useCallback(async (map: google.maps.Map) => {
    mapRef.current = map;
    try {
        const dbGeofences = await getGeofencesByCondoId(condo.id);
        const gfObjects = dbGeofences
            .map(dbGf => ({ id: dbGf.id, name: dbGf.name, shape: createShapeFromGeometry(dbGf.geometry) as google.maps.MVCObject }))
            .filter(gf => gf.shape);

        setGeofences(gfObjects);
        const defaultGfDb = dbGeofences.find(g => g.is_default);
        const initialDefaultId = defaultGfDb ? defaultGfDb.id : (gfObjects.length > 0 ? gfObjects[0].id : null);
        
        setDefaultGeofenceId(initialDefaultId);
        setSelectedGeofenceId(initialDefaultId);
        
        const geofenceToCenter = gfObjects.find(g => g.id === initialDefaultId);
        
        if (geofenceToCenter?.shape) {
            const bounds = getBoundsOfShape(geofenceToCenter.shape);
            if (bounds) {
                 google.maps.event.addListenerOnce(map, 'idle', () => {
                    recalculateZoomLevels();
                 });
                 map.fitBounds(bounds, 0);
            } else {
                 centerMapOnAddress();
            }
        } else {
            centerMapOnAddress();
        }
    } catch (error) {
        console.error("Failed to initialize map:", error);
        centerMapOnAddress();
    } finally {
        setIsLoading(false);
    }
  }, [condo.id, centerMapOnAddress, recalculateZoomLevels]);

  useEffect(() => {
    return () => {
        clearListeners();
        if (activeOverlay) { // @ts-ignore
             activeOverlay.setMap(null);
        }
    }
  }, [clearListeners, activeOverlay]);

  
  return (
    <>
        <Card>
        <CardHeader>
            <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
            <CardDescription>{t('condoDashboard.map.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="flex h-[70vh]">
                <div ref={mapContainerRef} className="flex-1 relative w-2/3 p-1">
                     <div className="relative h-full w-full bg-muted overflow-hidden shadow-inner rounded-md border">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader className="h-5 w-5 animate-spin" />
                                    <span>{t('condoDashboard.map.loadingMap')}</span>
                                </div>
                            </div>
                        )}
                        <MapComponent onMapLoad={handleMapLoad}>
                            <DrawingManagerComponent onOverlayComplete={onOverlayComplete} drawingManagerRef={drawingManagerRef} />
                            {condoAddressPosition && 
                                <AdvancedMarker position={condoAddressPosition} title={condo.name}>
                                    <svg
                                        className="h-10 w-10 text-slate-700 drop-shadow-lg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" fillOpacity="0.4"/>
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-4 7H7v3H5v-3H4v-2h1V8h2v1h1v2zm6 2h-2v-2h2v2zm4-1h-2v-1h2v-1h-2v-1h-2V8h4v3z"/>
                                    </svg>
                                </AdvancedMarker>
                            }
                        </MapComponent>
                    </div>
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
                    <fieldset className="border h-full rounded-md p-4 pt-2 flex flex-col">
                        <div className="text-right mb-4">
                            <h3 className="font-semibold">{condo.name}</h3>
                            <p className="text-xs text-muted-foreground">{condo.address}</p>
                             <Button onClick={centerMapOnAddress} variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">
                                {t('condoDashboard.map.recenterOnAddress')}
                            </Button>
                        </div>
                        <legend className="text-lg font-semibold tracking-tight px-2 -ml-2">
                            {t('condoDashboard.map.modules.title')}
                        </legend>
                        <div className="flex-1 flex flex-col space-y-4 pt-2">
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
                            </div>
                            {activeModule === 'geofence' && (
                                <GeofenceControls
                                    condoId={condo.id}
                                    geofences={geofences}
                                    onDataNeedsRefresh={onDataNeedsRefresh}
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
                                    drawingMode={drawingMode}
                                    setDrawingMode={setDrawingMode}
                                    isEditingEnabled={isEditingEnabled}
                                    setIsEditingEnabled={setIsEditingEnabled}
                                    showAllGeofences={showAllGeofences}
                                    setShowAllGeofences={setShowAllGeofences}
                                    onSettingsClick={() => setIsMapSettingsOpen(true)}
                                />
                            )}
                            {activeModule === 'elements' && (
                            <ElementsControls condoId={condo.id} />
                            )}
                        </div>
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

