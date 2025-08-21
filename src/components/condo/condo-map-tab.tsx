

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


// --- Style Definitions ---
const STYLE_FOCUSED_BLUE = { fillColor: 'hsl(210 80% 50%)', strokeColor: 'hsl(210 80% 50%)', fillOpacity: 0.2, strokeWeight: 2 };
const STYLE_EDIT_MODE_GREEN = { fillColor: 'hsl(142 71% 45%)', strokeColor: 'hsl(142 71% 45%)', fillOpacity: 0.2, strokeWeight: 2 };
const STYLE_VIEW_MODE_BLUE_NO_FILL = { fillColor: 'hsl(210 80% 50%)', strokeColor: 'hsl(210 80% 50%)', fillOpacity: 0.0, strokeWeight: 2 };
const STYLE_BACKGROUND_GREY = { fillColor: '#808080', strokeColor: '#808080', fillOpacity: 0.1, strokeWeight: 1 };


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
    if ('setPath' in shape && geometry.type === 'polygon') {
        (shape as google.maps.Polygon).setPath(geometry.paths);
    } else if ('setBounds' in shape && geometry.type === 'rectangle') {
        (shape as google.maps.Rectangle).setBounds(geometry.bounds);
    } else if ('setCenter' in shape && 'setRadius' in shape && geometry.type === 'circle') {
        (shape as google.maps.Circle).setCenter(geometry.center);
        (shape as google.maps.Circle).setRadius(geometry.radius);
    }
};


const getBoundsOfShape = (shape: google.maps.MVCObject | null): google.maps.LatLngBounds | null => {
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
      polygonOptions: { ...STYLE_FOCUSED_BLUE, editable: true, draggable: true },
      rectangleOptions: { ...STYLE_FOCUSED_BLUE, editable: true, draggable: true },
      circleOptions: { ...STYLE_FOCUSED_BLUE, editable: true, draggable: true },
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
  
  const mapShapesRef = useRef<Map<string, google.maps.MVCObject>>(new Map());
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>([]);
  
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'view' | 'editing'>('view');
  
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

  const activeShapeRef = useRef<{ id: string, shape: google.maps.MVCObject, originalGeometry?: any } | null>(null);
  
  
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


  const recalculateZoomLevels = useCallback(() => {
      const map = mapRef.current;
      const geofenceToCenter = dbGeofences.find(g => g.id === defaultGeofenceId);
      if (!map || !geofenceToCenter || !mapShapesRef.current) return;

      const shape = mapShapesRef.current.get(geofenceToCenter.id);
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
  }, [dbGeofences, defaultGeofenceId, fitLevel]);


  const applyZoomLevel = useCallback((level: '1' | '2' | '3') => {
    const map = mapRef.current;
    if (!map || !calculatedZoomLevels || !mapShapesRef.current) return;
    
    const geofenceToCenter = dbGeofences.find(g => g.id === defaultGeofenceId);
    if(geofenceToCenter) {
        const shape = mapShapesRef.current.get(geofenceToCenter.id);
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
  }, [calculatedZoomLevels, dbGeofences, defaultGeofenceId]);

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

  const setupShapeListeners = useCallback((shape: google.maps.MVCObject) => {
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
      
      const mapDiv = mapRef.current?.getDiv();
      if (!mapDiv) return;

      const mapMouseUpListener = () => {
            if (vertexChanged.current) {
              handleHistoryUpdate(shape);
              vertexChanged.current = false;
          }
      };

      mapDiv.addEventListener('mouseup', mapMouseUpListener);
      
      overlayListeners.current.push({ remove: () => mapDiv.removeEventListener('mouseup', mapMouseUpListener) } as any);
      overlayListeners.current.push(...listeners);
  }, [clearListeners, handleHistoryUpdate]);
    
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    // First, ensure all necessary shape objects exist in our reference map.
    dbGeofences.forEach(dbGf => {
      if (!mapShapesRef.current.has(dbGf.id)) {
        const newShape = createShapeFromGeometry(dbGf.geometry);
        if (newShape) {
          mapShapesRef.current.set(dbGf.id, newShape);
        }
      }
    });

    const isActionActive = !!activeShapeRef.current;
    const isDrawingNew = isActionActive && activeShapeRef.current.id.startsWith('new-shape-');

    // Determine the ID of the shape that should be in "focus" (blue)
    const focusId = isActionActive ? activeShapeRef.current.id : selectedGeofenceId;

    // Apply styles and visibility
    mapShapesRef.current.forEach((shape, id) => {
        let isVisible = false;
        let styleOptions: any = {};
        const isFocused = id === focusId;
        const isDefault = id === defaultGeofenceId;
        
        // Determine visibility
        if (mode === 'editing') {
            if (isFocused) {
                isVisible = true;
            } else if (isDrawingNew) {
                isVisible = (id === selectedGeofenceId); // Show reference geofence when drawing
            } else if (showAllGeofences) {
                isVisible = true;
            } else {
                isVisible = false;
            }
        } else { // mode === 'view'
            if (isDefault) {
                isVisible = true;
            } else if (showAllGeofences) {
                isVisible = true;
            } else if (isFocused) {
                isVisible = true;
            }
        }
        
        // Determine style
        if (isActionActive) {
            if (isFocused) {
                styleOptions = STYLE_FOCUSED_BLUE; // Blue for the shape being edited/drawn
            } else {
                styleOptions = STYLE_EDIT_MODE_GREEN; // Green for other visible shapes in edit mode
            }
        } else { // Not actively editing a shape
            if (mode === 'editing') {
                styleOptions = STYLE_EDIT_MODE_GREEN; // All green in visual edit mode
            } else { // View mode
                if (isDefault) {
                    styleOptions = STYLE_VIEW_MODE_BLUE_NO_FILL; // Default is blue outline
                } else {
                    styleOptions = STYLE_BACKGROUND_GREY; // Others are grey
                }
            }
        }

        // Determine if editable
        const isEditable = isActionActive && isFocused;

        shape.setOptions({ ...styleOptions, editable: isEditable, draggable: isEditable });
        shape.setMap(isVisible ? map : null);
    });

    // Special handling for a newly drawn shape that isn't in mapShapesRef yet
    if (isDrawingNew) {
        const shape = activeShapeRef.current.shape;
        shape.setOptions({ ...STYLE_FOCUSED_BLUE, editable: true, draggable: true });
        shape.setMap(map);
    }
    
    // Setup listeners
    if (activeShapeRef.current) {
        setupShapeListeners(activeShapeRef.current.shape);
    } else {
        clearListeners();
    }
  }, [mode, dbGeofences, selectedGeofenceId, defaultGeofenceId, showAllGeofences, isLoading, clearListeners, setupShapeListeners]);



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
           const shape = mapShapesRef.current.get(geofenceToCenter.id);
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

    restoreShapeToGeometry(shape, geometry);
    
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
                                    mapShapesRef={mapShapesRef}
                                    onDataNeedsRefresh={onDataNeedsRefresh}
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
                                    activeShapeRef={activeShapeRef}
                                    historyRef={historyRef}
                                    historyIndexRef={historyIndexRef}
                                    updateHistoryButtons={updateHistoryButtons}
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
