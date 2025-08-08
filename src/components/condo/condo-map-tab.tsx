
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  Undo,
  Redo,
  Layers,
} from 'lucide-react';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MapComponent from '@/components/map';
import { GeofenceControls, type DrawingMode } from './map/geofence-controls';
import { ElementsControls } from './map/elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence } from '@/actions/maps';


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
    
    // Explicitly check for circle first because a circle also has getBounds()
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
    if (!geometry) return null;
    
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

export default function CondoMapTab({ condo, center }: { condo: Condominio; center: { lat: number; lng: number } }) {
  const { t } = useLocale();
  const { toast } = useToast();
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


  const overlayListeners = useRef<google.maps.MapsEventListener[]>([]);
  const isEditingShape = isEditing || isCreating;

  useEffect(() => {
    async function fetchGeofences() {
        const dbGeofences = await getGeofencesByCondoId(condo.id);
        const gfObjects = dbGeofences.map(dbGf => ({
            id: dbGf.id,
            name: dbGf.name,
            shape: createShapeFromGeometry(dbGf.geometry) as google.maps.MVCObject
        }));
        
        let initialDefaultId: string | null = null;
        if (dbGeofences.length > 0) {
            const defaultGf = dbGeofences.find(g => g.is_default);
            initialDefaultId = defaultGf ? defaultGf.id : dbGeofences[0].id;
        }
        
        // Atomic state update
        setGeofences(gfObjects);
        setDefaultGeofenceId(initialDefaultId);
        setSelectedGeofenceId(initialDefaultId);
    }
    fetchGeofences();
  }, [condo.id]);

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
    if ('getRadius' in shape) changedEvent = 'radius_changed';
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
        // @ts-ignore
        if (activeOverlay) activeOverlay.setMap(null);
    }
  }, [clearListeners, activeOverlay]);

  useEffect(() => {
    // Clear all existing shapes from the map to prevent duplicates
    geofences.forEach(gf => { if (gf.shape) { (gf.shape as any).setMap(null); } });
    if (activeOverlay) { (activeOverlay as any).setMap(null); }
    clearListeners();
    
    // Show the active overlay for editing/creating
    if (isEditingShape && activeOverlay) {
        (activeOverlay as any).setOptions({ ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, editable: true, draggable: true, zIndex: 2, suppressUndo: true });
        (activeOverlay as any).setMap(map);
        setupListeners(activeOverlay);
    }
    
    // Show reference geofence(s) when editing is enabled
    if (isEditingEnabled) {
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
        // Logic for viewing mode
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
  }, [activeOverlay, isEditingShape, map, geofences, isEditingEnabled, viewAll, selectedGeofenceId, defaultGeofenceId, setupListeners, clearListeners]);
  
  return (
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
            <div className="w-2/3 p-1">
                 <div className="h-full w-full bg-muted overflow-hidden relative shadow-inner rounded-md border">
                   <MapComponent center={center} zoom={15}>
                       {isDrawing && (
                           <GeofenceControls.DrawingManager
                                drawingMode={drawingMode}
                               onOverlayComplete={(overlay: google.maps.MVCObject) => {
                                   setIsDrawing(false);
                                   setIsCreating(true);
                                   setActiveOverlay(overlay);
                                   updateHistory(getGeometryFromShape(overlay));
                                   toast({
                                       title: t('condoDashboard.map.toast.shapeDrawn.title'),
                                       description: t('condoDashboard.map.toast.shapeDrawn.description')
                                   });
                               }}
                           />
                       )}
                   </MapComponent>
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
            </div>
            <div className="w-1/3 p-1">
                <div className="relative border h-full p-4 pt-2 bg-card rounded-md">
                    <h2 className="text-lg font-semibold tracking-tight px-2 absolute -top-3.5 left-4 bg-card">{t('condoDashboard.map.modules.title')}</h2>
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
                           <ElementsControls />
                        )}
                    </div>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
