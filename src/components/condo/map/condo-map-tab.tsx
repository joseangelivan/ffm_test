
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

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from '@/lib/i18n';
import { ElementsControls } from './elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import MapContainer from '@/components/map/map-container';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import { GeofenceControls } from './geofence-controls';

interface CondoMapTabProps {
  condo: Condominio;
  initialPosition: { lat: number; lng: number };
  provider: DbMapProvider;
}

export default function CondoMapTab({ condo, initialPosition, provider }: CondoMapTabProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<any | null>(null);
  const drawingManagerRef = useRef<any | null>(null);
  
  const mapShapesRef = useRef<Map<string, any>>(new Map());
  
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

  const [activeShapeState, setActiveShapeState] = useState<{ id: string, shape: any | null, originalGeometry?: any } | null>(null);
  
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
    // Placeholder for OpenLayers implementation
  }, [condoAddressPosition]);

  const applyZoomLevel = useCallback(() => {
    // Placeholder for OpenLayers implementation
  }, []);

  const handleMapLoad = useCallback(async (map: any) => {
    mapRef.current = map;
    await onDataNeedsRefresh();
  }, [onDataNeedsRefresh]);
    
  const handleHistoryAction = (action: 'undo' | 'redo') => {
      // Placeholder for OpenLayers implementation
  };

  const handleShapeDrawn = (shape: any | null) => {
      // Placeholder for OpenLayers implementation
  };
  
  const handleZoomIn = () => mapRef.current?.getView().setZoom(mapRef.current.getView().getZoom() + 1);
  const handleZoomOut = () => mapRef.current?.getView().setZoom(mapRef.current.getView().getZoom() - 1);
  
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
                    <div className="col-span-1 md:col-span-2 relative p-1">
                        <div className="relative h-full w-full bg-muted overflow-hidden shadow-inner rounded-md border">
                            {isLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader className="h-5 w-5 animate-spin" />
                                        <span>{t('condoDashboard.map.loadingMap')}</span>
                                    </div>
                                </div>
                            )}
                            <MapContainer 
                                provider={provider}
                                onMapLoad={handleMapLoad}
                            />
                        </div>
                         {activeShapeState && (canUndo || canRedo) && (
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
                            <Button onClick={applyZoomLevel} variant="ghost" size="icon" title={t('condoDashboard.map.geofence.fitBounds')}>
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
                                    mapShapesRef={mapShapesRef}
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
            onApplyFit={(level) => setFitLevel(level)}
            isGeofenceAvailable={!!defaultGeofenceId}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}
