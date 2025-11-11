

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import type { Map as OlMap, Feature as OlFeature } from 'ol';
import type VectorSource from 'ol/source/Vector';
import type MapAdapterInterface from 'ol/Map';
import {
  Locate,
  Frame,
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
import { useCondoDashboard } from '@/contexts/condo-dashboard-context';

import type { Geometry } from 'ol/geom';


interface CondoMapTabProps {
  condo: Condominio & { geofences: DbGeofence[] };
  initialMapConfig: { center: { lat: number; lng: number }; zoom: number; } | null;
  searchedPosition: { lat: number, lng: number } | null;
}

export default function CondoMapTab({ condo, initialMapConfig, searchedPosition }: CondoMapTabProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { mapProvider } = useCondoDashboard();
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>(condo.geofences);
  
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);

  const [mode, setMode] = useState<'view' | 'editing'>('view');
  const [showAllGeofences, setShowAllGeofences] = useState(false);
  
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');
  
  // --- Active Shape & History State ---
  const [activeShapeState, setActiveShapeState] = useState<{ id: string, feature: OlFeature<any> | null, originalGeometry?: any } | null>(null);
  const [shapeBeingSaved, setShapeBeingSaved] = useState<{ id: string, feature: OlFeature<any> | null, originalGeometry?: any } | null>(null);
  const [historyStack, setHistoryStack] = useState<Geometry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('Polygon');

  const [mapInstance, setMapInstance] = useState<OlMap | null>(null);
  const [vectorSource, setVectorSource] = useState<VectorSource | null>(null);
  const [mapAdapter, setMapAdapter] = useState<MapAdapterInterface | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(initialMapConfig?.zoom || 4);


  const handleMapLoad = useCallback((map: OlMap, source: VectorSource, adapter: MapAdapterInterface) => {
    setMapInstance(map);
    setVectorSource(source);
    setMapAdapter(adapter);
  }, []);

  const applyZoomLevel = useCallback(() => {
    if(!mapAdapter) return;
    
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
        if(initialMapConfig) {
          mapAdapter.setCenter(initialMapConfig.center, 17);
        }
        return;
    }
    
    if(mapAdapter.fitToGeofence) {
        let paddingPercentage = 0.1;
        if (fitLevel === '1') paddingPercentage = 0.05;
        if (fitLevel === '3') paddingPercentage = 0.2;
        mapAdapter.fitToGeofence(geofenceIdToFit, paddingPercentage);
    }

  }, [mode, defaultGeofenceId, selectedGeofenceId, fitLevel, mapAdapter, initialMapConfig]);

  // This effect runs once when the map is loaded and ready.
  // Its job is to set the initial view, either by fitting to the default geofence or staying at the initial config.
  useEffect(() => {
    if (!mapAdapter) return; // Wait for map to be ready

    // If there's no initial config, it means we should fit to the geofence.
    if (!initialMapConfig && defaultGeofenceId) {
       const timeoutId = setTimeout(() => {
        applyZoomLevel();
      }, 250); // Small delay to ensure feature is drawn on map

      return () => clearTimeout(timeoutId);
    }
    // If there IS an initial config, the map already loaded with it, so we do nothing.
  }, [mapAdapter, defaultGeofenceId, initialMapConfig, applyZoomLevel]);

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
    }
  }, [condo.id, selectedGeofenceId, toast, t]);

  const centerMapOnAddress = useCallback(() => {
    if (!initialMapConfig || !mapAdapter) return;
    mapAdapter.setCenter(initialMapConfig.center, 17);
  }, [initialMapConfig, mapAdapter]);


  useEffect(() => {
    if (searchedPosition && mapAdapter) {
      mapAdapter.setCenter(searchedPosition, 18);
    }
  }, [searchedPosition, mapAdapter]);
    
  
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

  const onShapeDrawn = useCallback((feature: OlFeature<any>) => {
    if (!feature || !vectorSource) return;

    if (activeShapeState?.feature) {
      if(vectorSource.hasFeature(activeShapeState.feature)) {
        vectorSource.removeFeature(activeShapeState.feature);
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
  }, [activeShapeState, vectorSource, setActiveShapeState, setHistoryStack, setHistoryIndex]);
  
  if (!mapProvider) {
    return null;
  }

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
                    <Button onClick={centerMapOnAddress} variant="link" size="sm" className="p-0 h-auto" disabled={!initialMapConfig}>
                        <Locate className="h-3 w-3 mr-1" />
                        {t('condoDashboard.map.recenterOnAddress')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 h-[70vh]">
                    <div className="col-span-1 md:col-span-2 relative p-1">
                        <div className="relative h-full w-full bg-muted overflow-hidden shadow-inner rounded-md border">
                             <MapContainer 
                                provider={mapProvider} 
                                onMapLoad={handleMapLoad}
                                dbGeofences={dbGeofences}
                                activeShapeState={activeShapeState}
                                showAllGeofences={showAllGeofences}
                                selectedGeofenceId={selectedGeofenceId}
                                defaultGeofenceId={defaultGeofenceId}
                                mode={mode}
                                initialMapConfig={initialMapConfig}
                                shapeBeingSaved={shapeBeingSaved}
                                onZoomChange={setZoomLevel}
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
                             <Button onClick={() => mapAdapter?.zoomIn()} variant="ghost" size="icon" title="Zoom In">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </Button>
                            <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                            <Button onClick={() => mapAdapter?.zoomOut()} variant="ghost" size="icon" title="Zoom Out">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                                    mapInstance={mapInstance}
                                    historyStack={historyStack}
                                    setHistoryStack={setHistoryStack}
                                    historyIndex={historyIndex}
                                    setHistoryIndex={setHistoryIndex}
                                    vectorSource={vectorSource}
                                    drawingMode={drawingMode}
                                    setDrawingMode={setDrawingMode}
                                    setShapeBeingSaved={setShapeBeingSaved}
                                    activeShapeState={activeShapeState}
                                    setActiveShapeState={setActiveShapeState}
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
