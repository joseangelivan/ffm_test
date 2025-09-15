

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import {
  Locate,
  ZoomIn,
  ZoomOut,
  Frame,
  Loader,
  Undo,
  Redo,
} from 'lucide-react';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from '@/lib/i18n';
import { GeofenceControls, type DrawingMode } from './geofence-controls';
import { ElementsControls } from './elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import MapContainer from '@/components/map/map-container';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

import type { Map as OlMap, Feature } from 'ol';
import type { Vector as VectorSource } from 'ol/source';
import { fromLonLat } from 'ol/proj';
import type { Geometry } from 'ol/geom';


interface CondoMapTabProps {
  condo: Condominio & { geofences: DbGeofence[] };
  initialPosition: { lat: number; lng: number };
  provider: DbMapProvider;
}

export default function CondoMapTab({ condo, initialPosition, provider }: CondoMapTabProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  
  // --- Refs ---
  const olMapRef = useRef<OlMap | null>(null);

  // --- State ---
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>(condo.geofences);
  const [geofenceSource, setGeofenceSource] = useState<VectorSource | null>(null);
  
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
  
  // --- Active Shape & History State ---
  const [activeShapeState, setActiveShapeState] = useState<{ id: string, feature: Feature<any> | null, originalGeometry?: any } | null>(null);
  const [shapeBeingSaved, setShapeBeingSaved] = useState<{ id: string, feature: Feature<any> | null, originalGeometry?: any } | null>(null);
  const [historyStack, setHistoryStack] = useState<Geometry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('Polygon');

  // Initialize geofence selections on first load
  useEffect(() => {
    const defaultGf = condo.geofences.find(g => g.is_default);
    const initialSelectedId = defaultGf?.id || (condo.geofences.length > 0 ? condo.geofences[0].id : null);
    
    setDefaultGeofenceId(defaultGf?.id || null);
    setSelectedGeofenceId(initialSelectedId);
  }, [condo.geofences]);

  useEffect(() => {
    if (mode === 'view' || !selectedGeofenceId) return;
    const selectedGeofence = dbGeofences.find(g => g.id === selectedGeofenceId);
    if (!selectedGeofence) return;

    const type = selectedGeofence.geometry?.type;
    if (type === 'Circle') {
        setDrawingMode('Circle');
    } else if (type === 'Rectangle') {
        setDrawingMode('Rectangle');
    } else {
        setDrawingMode('Polygon');
    }
  }, [selectedGeofenceId, dbGeofences, mode]);


  // --- Data Fetching & Refreshing ---
  const onDataNeedsRefresh = useCallback(async (newSelectedId?: string) => {
    setIsLoading(true);
    // Do not reset active shape state here to allow continuous editing
    try {
        const freshDbGeofences = await getGeofencesByCondoId(condo.id);
        setDbGeofences(freshDbGeofences);
        
        const defaultGfDb = freshDbGeofences.find(g => g.is_default);
        setDefaultGeofenceId(defaultGfDb ? defaultGfDb.id : null);
        
        // If a specific ID is provided (e.g., after creating a new geofence), select it.
        // Otherwise, maintain the current selection unless it was deleted.
        if (newSelectedId) {
            setSelectedGeofenceId(newSelectedId);
        } else {
            const currentSelectionExists = freshDbGeofences.some(g => g.id === selectedGeofenceId);
            if (!currentSelectionExists) {
                // If the selected geofence was deleted, fall back to the default or first available.
                setSelectedGeofenceId(defaultGfDb?.id || (freshDbGeofences.length > 0 ? freshDbGeofences[0].id : null));
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
    if (!condoAddressPosition || !olMapRef.current) return;
    
    olMapRef.current.getView().animate({
        center: fromLonLat([condoAddressPosition.lng, condoAddressPosition.lat]),
        zoom: 17,
        duration: 800,
    });
  }, [condoAddressPosition]);

  const applyZoomLevel = useCallback(() => {
    const map = olMapRef.current;
    if (!map) return;

    const mapSize = map.getSize();
    if (!mapSize || mapSize.some(s => s === 0)) {
        return;
    }
    
    if (!geofenceSource) {
        centerMapOnAddress();
        return;
    }

    let geofenceIdToFit: string | null;

    if (mode === 'view') {
        geofenceIdToFit = defaultGeofenceId;
    } else {
        const isEditingNewShape = selectedGeofenceId?.startsWith('new-shape-');
        if (isEditingNewShape) {
            return;
        }
        geofenceIdToFit = selectedGeofenceId || defaultGeofenceId;
    }
    
    if (!geofenceIdToFit) {
        centerMapOnAddress();
        return;
    }

    const featureToFit = geofenceSource.getFeatureById(geofenceIdToFit);
    if (!featureToFit) return;

    const extent = featureToFit.getGeometry()?.getExtent();
    if (extent) {
        let paddingPercentage = 0.1;
        if (fitLevel === '1') paddingPercentage = 0.05;
        if (fitLevel === '3') paddingPercentage = 0.2;

        const padding = map.getSize()!.map(s => s * paddingPercentage);

        map.getView().fit(extent, {
            padding: [padding[1], padding[0], padding[1], padding[0]],
            duration: 800,
            maxZoom: 20
        });
    }
  }, [mode, geofenceSource, defaultGeofenceId, selectedGeofenceId, fitLevel, centerMapOnAddress]);


  // --- Map Interactions ---
  const handleMapLoad = useCallback((map: OlMap, source?: VectorSource) => {
        olMapRef.current = map;
        setGeofenceSource(source || null);
        
        map.on('moveend', () => {
            const zoom = map.getView().getZoom();
            if (zoom) setZoomLevel(Math.round(zoom));
        });

        setIsLoading(false);
        applyZoomLevel();
    }, [applyZoomLevel]);

    
    const handleZoomIn = () => {
        if (olMapRef.current) {
            olMapRef.current.getView().setZoom(olMapRef.current.getView().getZoom()! + 1);
        }
    };
    const handleZoomOut = () => {
        if (olMapRef.current) {
            olMapRef.current.getView().setZoom(olMapRef.current.getView().getZoom()! - 1);
        }
    };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const geometryToRestore = historyStack[newIndex].clone();
      activeShapeState?.feature?.setGeometry(geometryToRestore);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const geometryToRestore = historyStack[newIndex].clone();
      activeShapeState?.feature?.setGeometry(geometryToRestore);
    }
  };

  const onShapeDrawn = useCallback((feature: Feature<any>) => {
    if (!feature) return;

    if (activeShapeState?.feature && geofenceSource) {
      if(geofenceSource.hasFeature(activeShapeState.feature)) {
        geofenceSource.removeFeature(activeShapeState.feature);
      }
    }

    const newId = `new-shape-${Date.now()}`;
    feature.setId(newId);
    setActiveShapeState({ id: newId, feature, originalGeometry: null });
    
    const newGeometry = feature.getGeometry();
    if(newGeometry) {
      setHistoryStack([newGeometry.clone()]);
      setHistoryIndex(0);
    } else {
      setHistoryStack([]);
      setHistoryIndex(-1);
    }
  }, [activeShapeState, geofenceSource, setActiveShapeState, setHistoryStack, setHistoryIndex]);

  useEffect(() => {
    if (mode === 'view') {
        applyZoomLevel();
    }
  }, [mode, applyZoomLevel]);
  
  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4">
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
                                dbGeofences={dbGeofences}
                                activeShapeState={activeShapeState}
                                showAllGeofences={showAllGeofences}
                                selectedGeofenceId={selectedGeofenceId}
                                defaultGeofenceId={defaultGeofenceId}
                                mode={mode}
                                initialPosition={initialPosition}
                                shapeBeingSaved={shapeBeingSaved}
                            />
                        </div>
                         {activeShapeState && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex items-center gap-1 backdrop-blur-sm">
                                <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleUndo} disabled={historyIndex <= 0}>
                                    <Undo className="h-4 w-4"/>
                                    {t('condoDashboard.map.undo')}
                                </Button>
                                <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleRedo} disabled={historyIndex >= historyStack.length - 1}>
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
                                    onFitView={applyZoomLevel}
                                    onShapeDrawn={onShapeDrawn}
                                    selectedGeofenceId={selectedGeofenceId}
                                    setSelectedGeofenceId={setSelectedGeofenceId}
                                    defaultGeofenceId={defaultGeofenceId}
                                    setDefaultGeofenceId={setDefaultGeofenceId}
                                    mode={mode}
                                    setMode={setMode}
                                    showAllGeofences={showAllGeofences}
                                    setShowAllGeofences={setShowAllGeofences}
                                    onSettingsClick={() => setIsMapSettingsOpen(true)}
                                    activeShapeState={activeShapeState}
                                    setActiveShapeState={setActiveShapeState}
                                    mapRef={olMapRef}
                                    historyStack={historyStack}
                                    setHistoryStack={setHistoryStack}
                                    historyIndex={historyIndex}
                                    setHistoryIndex={setHistoryIndex}
                                    geofenceSource={geofenceSource}
                                    drawingMode={drawingMode}
                                    setDrawingMode={setDrawingMode}
                                    setShapeBeingSaved={setShapeBeingSaved}
                                    isGoogleMap={provider.provider_type === 'google'}
                                />
                            )}
                            {selectedModule === 'elements' && (
                                <ElementsControls condoId={condo.id} />
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
                applyZoomLevel();
            }}
            isGeofenceAvailable={!!defaultGeofenceId}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}
