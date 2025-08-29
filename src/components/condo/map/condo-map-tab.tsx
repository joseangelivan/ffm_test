

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import {
  Locate,
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
import { GeofenceControls } from './geofence-controls';
import { ElementsControls } from './elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    STYLE_FOCUSED_BLUE,
    createShapeFromGeometry,
    getBoundsOfShape,
    getCenterOfShape,
    getGeometryFromShape,
    restoreShapeToGeometry,
    STYLE_VIEW_MODE,
    STYLE_BACKGROUND_GREY,
    STYLE_REFERENCE_GREEN,
} from './geofence-helpers';
import MapContainer from '@/components/map/map-container';


interface MapRendererProps {
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
      polygonOptions: { ...STYLE_FOCUSED_BLUE },
      rectangleOptions: { ...STYLE_FOCUSED_BLUE },
      circleOptions: { ...STYLE_FOCUSED_BLUE },
    });

    drawingManagerRef.current = newDrawingManager;
    
    return () => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }
    };
  }, [drawingLibrary, drawingManagerRef, map]);

  return null;
};

function MapRenderer({ condo, initialPosition, onMapLoad, drawingManagerRef }: MapRendererProps) {
  const map = useMap();
  useEffect(() => {
    if (map && onMapLoad) {
        onMapLoad(map);
    }
  }, [map, onMapLoad]);

  return (
    <>
        <DrawingManagerComponent drawingManagerRef={drawingManagerRef} />
        {initialPosition && (
            <AdvancedMarker position={initialPosition} title={condo.name}>
                <Building className="h-8 w-8 text-slate-700 drop-shadow-lg" />
            </AdvancedMarker>
        )}
    </>
  );
}


export default function CondoMapTab({ condo, initialPosition }: { condo: Condominio, initialPosition: { lat: number; lng: number } }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const mapInitialized = useRef(false);
  const isDraggingRef = useRef(false);
  const isRestoringRef = useRef(false);
  
  const mapShapesRef = useRef<Map<string, google.maps.MVCObject>>(new Map());
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>([]);
  
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'view' | 'editing'>('view');
  
  const [showAllGeofences, setShowAllGeofences] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(15);
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(true);
  
  const [condoAddressPosition] = useState(initialPosition);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');

  // --- History State Management ---
  const [activeShapeState, setActiveShapeState] = useState<{ id: string, shape: google.maps.MVCObject | null, originalGeometry?: any } | null>(null);
  
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  const canUndo = undoStack.length > 1;
  const canRedo = redoStack.length > 0;
  
  const onDataNeedsRefresh = useCallback(async (newSelectedId?: string) => {
    setIsLoading(true);
    try {
        const freshDbGeofences = await getGeofencesByCondoId(condo.id);
        setDbGeofences(freshDbGeofences);
        
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


  const getZoomForBounds = useCallback((bounds: google.maps.LatLngBounds, mapDim: { width: number, height: number }) => {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;

    function latRad(lat: number) {
        const sin = Math.sin(lat * Math.PI / 180);
        const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
        return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx: number, worldPx: number, fraction: number) {
        return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;
    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

    const latZoom = zoom(mapDim.height, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(mapDim.width, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }, []);
  
  const applyZoomLevel = useCallback(() => {
    const map = mapRef.current;
    let geofenceIdToFit: string | null;

    if (mode === 'view') {
        geofenceIdToFit = defaultGeofenceId;
    } else {
        geofenceIdToFit = selectedGeofenceId || defaultGeofenceId;
    }
    
    if (!map || !geofenceIdToFit) {
        if(map) centerMapOnAddress();
        return;
    }

    const geofenceShape = mapShapesRef.current.get(geofenceIdToFit);
    if (!geofenceShape) return;
    
    const bounds = getBoundsOfShape(geofenceShape);
    const mapDiv = map.getDiv();
    if (!bounds || !mapDiv) return;

    const mapDim = {
        width: mapDiv.offsetWidth,
        height: mapDiv.offsetHeight
    };
    
    const calculatedZoom = getZoomForBounds(bounds, mapDim);

    let finalZoom = calculatedZoom;
    if (fitLevel === '2') finalZoom = calculatedZoom > 0 ? calculatedZoom - 1 : 0;
    if (fitLevel === '3') finalZoom = calculatedZoom > 1 ? calculatedZoom - 2 : 1;
    
    if (map.getZoom() !== finalZoom) {
        map.setZoom(finalZoom);
    }
    map.setCenter(bounds.getCenter());

}, [mode, defaultGeofenceId, selectedGeofenceId, getZoomForBounds, fitLevel, centerMapOnAddress]);


  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const zoomListener = mapRef.current.addListener('zoom_changed', () => {
      const currentZoom = mapRef.current?.getZoom();
      if (currentZoom) setZoomLevel(currentZoom);
    });
    
    return () => { 
        zoomListener.remove();
    };
  }, []);
    
  const handleHistoryUpdate = useCallback((newGeometry: any) => {
    setUndoStack(prev => {
        if (prev.length > 0 && isEqual(newGeometry, prev[prev.length - 1])) {
            return prev;
        }
        return [...prev, newGeometry];
    });
    setRedoStack([]);
  }, []);
  
  const debouncedHistoryUpdate = useCallback(debounce(handleHistoryUpdate, 100), [handleHistoryUpdate]);
  
  useEffect(() => {
    const shape = activeShapeState?.shape;
    if (!shape || mode !== 'editing' || !mapRef.current) return;

    const handleDragStart = () => { isDraggingRef.current = true; };
    const handleDragEnd = () => {
        if (!isRestoringRef.current) {
            const newGeometry = getGeometryFromShape(shape);
            handleHistoryUpdate(newGeometry);
        }
        isDraggingRef.current = false;
    };
    
    const setupListeners = () => {
        const listeners = [
            shape.addListener('dragstart', handleDragStart),
            shape.addListener('dragend', handleDragEnd),
        ];

        if ('getRadius' in shape) {
            listeners.push(shape.addListener('radius_changed', () => {
                if (isDraggingRef.current || isRestoringRef.current) return;
                const newGeometry = getGeometryFromShape(shape);
                debouncedHistoryUpdate(newGeometry);
            }));
        }

        if ('getPath' in shape) {
            const path = (shape as google.maps.Polygon).getPath();
            const handleChange = () => {
                if (isDraggingRef.current || isRestoringRef.current) return;
                const newGeometry = getGeometryFromShape(shape);
                debouncedHistoryUpdate(newGeometry);
            };
            listeners.push(path.addListener('set_at', handleChange));
            listeners.push(path.addListener('insert_at', handleChange));
            listeners.push(path.addListener('remove_at', handleChange));
        }

        if ('getBounds' in shape) {
             listeners.push(shape.addListener('bounds_changed', () => {
                if (isDraggingRef.current || isRestoringRef.current) return;
                const newGeometry = getGeometryFromShape(shape);
                debouncedHistoryUpdate(newGeometry);
            }));
        }
        
        return listeners;
    };
    
    const listeners = setupListeners();

    return () => {
        listeners.forEach(listener => listener.remove());
        debouncedHistoryUpdate.cancel();
    };
}, [activeShapeState, mode, debouncedHistoryUpdate, handleHistoryUpdate]);
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    dbGeofences.forEach(dbGf => {
        if (!mapShapesRef.current.has(dbGf.id)) {
            const newShape = createShapeFromGeometry(dbGf.geometry);
            if (newShape) mapShapesRef.current.set(dbGf.id, newShape);
        }
    });

    mapShapesRef.current.forEach((shape, id) => {
        if (shape !== activeShapeState?.shape) {
            const isSelected = id === selectedGeofenceId;
            const isDefault = id === defaultGeofenceId;
            let styleOptions: any = {};
            let isVisible = false;

            if (mode === 'view') {
                isVisible = (isDefault && !showAllGeofences) || showAllGeofences;
                styleOptions = isDefault ? { ...STYLE_VIEW_MODE } : { ...STYLE_BACKGROUND_GREY };
                if (isSelected && !isDefault) styleOptions = { ...STYLE_VIEW_MODE };
            } else { // mode === 'editing'
                isVisible = showAllGeofences || isSelected;
                styleOptions = isSelected ? { ...STYLE_REFERENCE_GREEN, fillOpacity: 0.3 } : { ...STYLE_BACKGROUND_GREY };
            }
            shape.setOptions({ ...styleOptions, editable: false, draggable: false });
            shape.setMap(isVisible ? map : null);
        }
    });
    
    if (activeShapeState?.shape) {
        const shape = activeShapeState.shape;
        shape.setOptions(STYLE_FOCUSED_BLUE);
        shape.setMap(map);
    }
    
}, [
    mode,
    dbGeofences,
    selectedGeofenceId,
    defaultGeofenceId,
    showAllGeofences,
    isLoading,
    activeShapeState
]);
  
  const handleMapLoad = useCallback(async (map: google.maps.Map) => {
    if (mapInitialized.current) return;
    mapInitialized.current = true;
    mapRef.current = map;
    await onDataNeedsRefresh();
  }, [onDataNeedsRefresh]);

    useEffect(() => {
        if (!isLoading && mapRef.current) {
            applyZoomLevel();
        }
    }, [isLoading, applyZoomLevel]);
    
  const setHistoryStacks = (undo: any[], redo: any[]) => {
      setUndoStack(undo);
      setRedoStack(redo);
  };
    
  const handleUndo = () => {
      if (!canUndo) return;

      const newUndoStack = [...undoStack];
      const lastState = newUndoStack.pop();
      const prevState = newUndoStack[newUndoStack.length - 1];

      if (lastState && activeShapeState?.shape && prevState) {
          isRestoringRef.current = true;
          restoreShapeToGeometry(activeShapeState.shape, prevState);
          setHistoryStacks(newUndoStack, [lastState, ...redoStack]);
          setTimeout(() => { isRestoringRef.current = false; }, 50);
      }
  };

  const handleRedo = () => {
      if (!canRedo) return;

      const newRedoStack = [...redoStack];
      const nextState = newRedoStack.shift();
      
      if (nextState && activeShapeState?.shape) {
          isRestoringRef.current = true;
          restoreShapeToGeometry(activeShapeState.shape, nextState);
          setHistoryStacks([...undoStack, nextState], newRedoStack);
          setTimeout(() => { isRestoringRef.current = false; }, 50);
      }
  };
  
  const handleShapeDrawn = (shape: google.maps.MVCObject | null) => {
    if(!shape) return;

    if (activeShapeState?.shape) {
      activeShapeState.shape.setMap(null);
    }
    const newId = `new-shape-${Date.now()}`;
    mapShapesRef.current.set(newId, shape);
    setActiveShapeState({ id: newId, shape, originalGeometry: null });
    
    const newGeometry = getGeometryFromShape(shape);
    setUndoStack([newGeometry]);
    setRedoStack([]);
  };

  const handleZoomIn = () => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom()! + 1);
  const handleZoomOut = () => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom()! - 1);
  
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
                            <MapContainer>
                                <MapComponent mapId="follow-for-me-map">
                                    <MapRenderer 
                                        condo={condo}
                                        initialPosition={initialPosition}
                                        onMapLoad={handleMapLoad}
                                        drawingManagerRef={drawingManagerRef}
                                    />
                                </MapComponent>
                            </MapContainer>
                        </div>
                         {activeShapeState && (canUndo || canRedo) && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex items-center gap-1 backdrop-blur-sm">
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
                        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex flex-col items-center gap-1 backdrop-blur-sm">
                            <Button onClick={handleZoomIn} variant="ghost" size="icon" title="Zoom In">
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                            <Button onClick={handleZoomOut} variant="ghost" size="icon" title="Zoom Out">
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <Button onClick={applyZoomLevel} variant="ghost" size="icon" title={t('condoDashboard.map.geofence.fitBounds')} disabled={(mode === 'editing' && !selectedGeofenceId && !defaultGeofenceId) || (mode === 'view' && !defaultGeofenceId)}>
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
                                    onShapeDrawn={handleShapeDrawn}
                                    selectedGeofenceId={selectedGeofenceId}
                                    setSelectedGeofenceId={setSelectedGeofenceId}
                                    defaultGeofenceId={defaultGeofenceId}
                                    setDefaultGeofenceId={setDefaultGeofenceId}
                                    mode={mode}
                                    setMode={setMode}
                                    drawingManager={drawingManagerRef.current}
                                    showAllGeofences={showAllGeofences}
                                    setShowAllGeofences={setShowAllGeofences}
                                    onSettingsClick={() => setIsMapSettingsOpen(true)}
                                    activeShapeState={activeShapeState}
                                    setActiveShapeState={setActiveShapeState}
                                    setUndoStack={setUndoStack}
                                    setRedoStack={setRedoStack}
                                    mapRef={mapRef}
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
            onApplyFit={(level) => {
                setFitLevel(level);
                const map = mapRef.current;
                const geofenceIdToFit = mode === 'view' ? defaultGeofenceId : (selectedGeofenceId || defaultGeofenceId);
                if (map && geofenceIdToFit) {
                    const geofenceShape = mapShapesRef.current.get(geofenceIdToFit);
                    if (geofenceShape) {
                        const bounds = getBoundsOfShape(geofenceShape);
                        const mapDiv = map.getDiv();
                        if (bounds && mapDiv) {
                            const mapDim = { width: mapDiv.offsetWidth, height: mapDiv.offsetHeight };
                            const calculatedZoom = getZoomForBounds(bounds, mapDim);
                            let finalZoom = calculatedZoom;
                            if (level === '2') finalZoom = calculatedZoom > 0 ? calculatedZoom - 1 : 0;
                            if (level === '3') finalZoom = calculatedZoom > 1 ? calculatedZoom - 2 : 1;
                            map.setZoom(finalZoom);
                            map.setCenter(bounds.getCenter());
                        }
                    }
                }
            }}
            isGeofenceAvailable={!!defaultGeofenceId}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}
