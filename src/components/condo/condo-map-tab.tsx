
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
import { GeofenceControls } from './map/geofence-controls';
import { ElementsControls } from './map/elements-controls';


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
    const shapeType = 'getPaths' in shape ? 'polygon' : 'getBounds' in shape ? 'rectangle' : 'getRadius' in shape ? 'circle' : null;
    
    switch (shapeType) {
        case 'polygon': {
            const path = (shape as google.maps.Polygon).getPath();
            return { type: 'polygon', paths: path.getArray().map((latLng: google.maps.LatLng) => ({ lat: latLng.lat(), lng: latLng.lng() })) };
        }
        case 'rectangle':
            return { type: 'rectangle', bounds: (shape as google.maps.Rectangle).getBounds()?.toJSON() };
        case 'circle':
            return { type: 'circle', center: (shape as google.maps.Circle).getCenter()?.toJSON(), radius: (shape as google.maps.Circle).getRadius() };
        default:
            return null;
    }
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

  const overlayListeners = useRef<google.maps.MapsEventListener[]>([]);
  const isEditingShape = isEditing || isCreating;

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
        setActiveOverlay(newShape);
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    
    historyIndexRef.current++;
    const nextGeometry = historyRef.current[historyIndexRef.current];
    const newShape = createShapeFromGeometry(nextGeometry);
    
    if (newShape) {
        setActiveOverlay(newShape);
    }

    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [canRedo]);
  
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
        overlayListeners.current.push(google.maps.event.addListener(shape, 'dragend', updateAndRecordHistory));
    }
  }, [updateHistory, clearListeners]);

  useEffect(() => {
    return () => {
        clearListeners();
        // @ts-ignore
        if (activeOverlay) activeOverlay.setMap(null);
    }
  }, [clearListeners, activeOverlay]);

  useEffect(() => {
    geofences.forEach(gf => {
      // @ts-ignore
      if (gf.shape) gf.shape.setMap(null);
    });
    // @ts-ignore
    if(activeOverlay) activeOverlay.setMap(null);
    
    if (activeOverlay && isEditingShape) {
      // @ts-ignore
      activeOverlay.setOptions({ ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, editable: true, draggable: true, zIndex: 2, suppressUndo: true });
      // @ts-ignore
      activeOverlay.setMap(map);
      setupListeners(activeOverlay);
    } else {
        clearListeners();
    }
    
  }, [activeOverlay, isEditingShape, map, setupListeners, clearListeners, geofences]);

  
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
