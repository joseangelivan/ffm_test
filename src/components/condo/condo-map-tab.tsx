
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Locate,
  Pin,
  ZoomIn,
  ZoomOut,
  Frame,
  Building,
  Loader,
} from 'lucide-react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocale } from '@/lib/i18n';
import MapComponent, { AdvancedMarker } from '@/components/map';
import { GeofenceControls } from './map/geofence-controls';
import { ElementsControls } from './map/elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map/map-settings-dialog';
import { useToast } from '@/hooks/use-toast';

export const EDIT_COLOR = { fillColor: '#3498db', strokeColor: '#2980b9', strokeWeight: 2, editable: true, draggable: true };
export const SAVED_COLOR = { fillColor: '#2ECC71', strokeColor: '#27AE60', strokeWeight: 2, editable: false, draggable: false, clickable: true };
export const VIEW_ALL_COLOR = { fillColor: '#95a5a6', strokeColor: '#7f8c8d', strokeWeight: 1, editable: false, draggable: false, clickable: false };
export const DEFAULT_COLOR = { fillColor: 'hsl(28 80% 50% / 0.3)', strokeColor: 'hsl(28 80% 50%)', strokeWeight: 2, editable: false, draggable: false, clickable: true };


export const getGeometryFromShape = (shape: google.maps.MVCObject | null): any | null => {
    if (!shape) return null;
    
    if ('getRadius' in shape && typeof (shape as any).getRadius === 'function') {
        return { type: 'circle', center: (shape as google.maps.Circle).getCenter()?.toJSON(), radius: (shape as google.maps.Circle).getRadius() };
    }
    if ('getPath' in shape && typeof (shape as any).getPath === 'function') {
        const path = (shape as google.maps.Polygon).getPath();
        return { type: 'polygon', paths: path.getArray().map((latLng: google.maps.LatLng) => ({ lat: latLng.lat(), lng: latLng.lng() })) };
    }
    if ('getBounds' in shape && typeof (shape as any).getBounds === 'function') {
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

const getBoundsOfShape = (shape: google.maps.MVCObject | null): google.maps.LatLngBounds | null => {
    if (!shape) return null;
    if ('getBounds' in shape && typeof (shape as any).getBounds === 'function') return (shape as google.maps.Rectangle | google.maps.Circle).getBounds();
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

  const clearListeners = useCallback(() => {
    overlayListeners.current.forEach(l => l.remove());
    overlayListeners.current = [];
  }, []);

  const updateAndRecordHistory = useCallback((shape: google.maps.MVCObject) => {
    const newGeometry = getGeometryFromShape(shape);
    if (!newGeometry) return;
    
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newGeometry);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, [historyRef, historyIndexRef]);
  
  const setupListeners = useCallback((shape: google.maps.MVCObject, onShapeChanged: () => void) => {
        clearListeners();
        const listeners: google.maps.MapsEventListener[] = [];
        
        if (typeof google === 'undefined' || !google.maps.event) return;
        const event = google.maps.event;

        listeners.push(event.addListener(shape, 'dragend', onShapeChanged));
        
        if ('getPath' in shape && typeof (shape as any).getPath === 'function') { // Polygon
            const path = (shape as google.maps.Polygon).getPath();
            listeners.push(event.addListener(path, 'set_at', onShapeChanged));
            listeners.push(event.addListener(path, 'insert_at', onShapeChanged));
            listeners.push(event.addListener(path, 'remove_at', onShapeChanged));
        } else if ('getRadius' in shape && typeof (shape as any).getRadius === 'function') { // Circle
            listeners.push(event.addListener(shape, 'radius_changed', onShapeChanged));
            listeners.push(event.addListener(shape, 'center_changed', onShapeChanged));
        } else if ('getBounds' in shape && typeof (shape as any).getBounds === 'function') { // Rectangle
            listeners.push(event.addListener(shape, 'bounds_changed', onShapeChanged));
        }
        overlayListeners.current = listeners;
    }, [clearListeners]);
  
  
  useEffect(() => {
        const newShapes = new Map<string, google.maps.MVCObject>();
        for (const dbGf of dbGeofences) {
            const shape = createShapeFromGeometry(dbGf.geometry);
            if (shape) {
                newShapes.set(dbGf.id, shape);
            }
        }
        setMapShapes(newShapes);
  }, [dbGeofences]);

  useEffect(() => {
      const map = mapRef.current;
      if (!map || isLoading) return;

      mapShapes.forEach((shape) => shape.setMap(null));
      
      clearListeners();

      if (mode === 'editing') {
          const shapeToEdit = selectedGeofenceId ? mapShapes.get(selectedGeofenceId) : null;
          if (shapeToEdit) {
              (shapeToEdit as any).setOptions(EDIT_COLOR);
              shapeToEdit.setMap(map);
              setupListeners(shapeToEdit, () => updateAndRecordHistory(shapeToEdit));
          }
      } else if (mode === 'drawing') {
          // Drawing manager handles the new shape visibility
      } else { // 'view' mode
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
              shape.setMap(isVisible ? map : null);
          });
      }
  }, [
      mode, selectedGeofenceId, defaultGeofenceId, showAllGeofences,
      mapShapes, clearListeners, isEditingEnabled, isLoading, setupListeners, updateAndRecordHistory
  ]);
  
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
                            <Tabs defaultValue="geofence" className="flex-1 flex flex-col">
                                <TabsList>
                                    <TabsTrigger value="geofence">{t('condoDashboard.map.modules.geofence')}</TabsTrigger>
                                    <TabsTrigger value="elements">{t('condoDashboard.map.modules.elements')}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="geofence" className="flex-1 flex flex-col space-y-4 pt-2">
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
                                        mapShapes={mapShapes}
                                        setupListeners={setupListeners}
                                        clearListeners={clearListeners}
                                        updateAndRecordHistory={updateAndRecordHistory}
                                        historyRef={historyRef}
                                        historyIndexRef={historyIndexRef}
                                    />
                                </TabsContent>
                                <TabsContent value="elements" className="flex-1">
                                    <ElementsControls condoId={condo.id}/>
                                </TabsContent>
                            </Tabs>
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
