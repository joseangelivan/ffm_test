

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
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
import { useCondoDashboard } from '@/contexts/condo-dashboard-context';

import type { Feature as OlFeature } from 'ol';
import type { Geometry } from 'ol/geom';


interface CondoMapTabProps {
  condo: Condominio & { geofences: DbGeofence[] };
  initialPosition: { lat: number; lng: number };
}

export type MapAdapter = {
    onMoveEnd: (callback: (zoom: number) => void) => void;
    setCenter: (coords: { lat: number; lng: number }, zoom?: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    fitToGeofence: (geofenceId: string, paddingPercentage: number) => void;
    getMapInstance: () => any;
};

export default function CondoMapTab({ condo, initialPosition }: CondoMapTabProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { mapProvider } = useCondoDashboard();
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>(condo.geofences);
  
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);

  const [mode, setMode] = useState<'view' | 'editing'>('view');
  const [showAllGeofences, setShowAllGeofences] = useState(false);
  
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(true);
  const [condoAddressPosition] = useState(initialPosition);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');
  
  // --- Active Shape & History State ---
  const [activeShapeState, setActiveShapeState] = useState<{ id: string, feature: OlFeature<any> | null, originalGeometry?: any } | null>(null);
  const [shapeBeingSaved, setShapeBeingSaved] = useState<{ id: string, feature: OlFeature<any> | null, originalGeometry?: any } | null>(null);
  const [historyStack, setHistoryStack] = useState<Geometry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('Polygon');

  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const [mapAdapter, setMapAdapter] = useState<MapAdapter | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(15);


  // Initialize map and adapter
   useEffect(() => {
    if (!mapProvider || !mapRef.current) {
      let config: any;
      try {
        config = typeof mapProvider?.config_json === 'string' 
            ? JSON.parse(mapProvider.config_json) 
            : mapProvider?.config_json || {};
      } catch (e) { config = {}; }
      
      const apiConfig = config.api_config || {};
      const baseUrl = apiConfig.base_url;

      let source;
      if (baseUrl) {
          source = new XYZ({ url: baseUrl, maxZoom: 20 });
      } else {
          source = new OSM();
      }
      
      const initialLayer = new TileLayer({ source });
      const newVectorSource = new VectorSource();
      const vectorLayer = new VectorLayer({
        source: newVectorSource,
        style: (feature) => feature.get('style'),
      });
      vectorLayer.set('id', 'geofence-layer');

      const newMapInstance = new Map({
          layers: [initialLayer, vectorLayer],
          view: new View({
              center: fromLonLat([initialPosition.lng, initialPosition.lat]),
              zoom: 4,
          }),
          controls: [],
      });
      
      mapRef.current = newMapInstance;
      vectorSourceRef.current = newVectorSource;

      // Create adapter
      const adapter: MapAdapter = {
          onMoveEnd: (callback) => {
            newMapInstance.on('moveend', () => {
                  const zoom = newMapInstance.getView().getZoom();
                  if (zoom) callback(zoom);
              });
          },
          setCenter: (coords, zoom) => {
            newMapInstance.getView().animate({
                  center: fromLonLat([coords.lng, coords.lat]),
                  zoom: zoom || newMapInstance.getView().getZoom(),
                  duration: 800,
              });
          },
          zoomIn: () => newMapInstance.getView().setZoom(newMapInstance.getView().getZoom()! + 1),
          zoomOut: () => newMapInstance.getView().setZoom(newMapInstance.getView().getZoom()! - 1),
          fitToGeofence: (geofenceId, paddingPercentage) => {
              const featureToFit = newVectorSource.getFeatureById(geofenceId);
              if (featureToFit) {
                  const extent = featureToFit.getGeometry()?.getExtent();
                  if (extent && extent.every(isFinite)) {
                       const mapSize = newMapInstance.getSize()!;
                       const padding = mapSize.map((s: number) => s * paddingPercentage);
                       newMapInstance.getView().fit(extent, {
                          padding: [padding[1], padding[0], padding[1], padding[0]],
                          duration: 800,
                          maxZoom: 20
                      });
                  }
              }
          },
          getMapInstance: () => newMapInstance,
      };
      setMapAdapter(adapter);
      adapter.onMoveEnd((zoom: number) => {
          setZoomLevel(Math.round(zoom));
      });
      setIsLoading(false);
    }
  }, [mapProvider, initialPosition]);


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
    if (!condoAddressPosition || !mapAdapter) return;
    mapAdapter.setCenter(condoAddressPosition, 17);
  }, [condoAddressPosition, mapAdapter]);

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
        centerMapOnAddress();
        return;
    }
    
    if(mapAdapter.fitToGeofence) {
        let paddingPercentage = 0.1;
        if (fitLevel === '1') paddingPercentage = 0.05;
        if (fitLevel === '3') paddingPercentage = 0.2;
        mapAdapter.fitToGeofence(geofenceIdToFit, paddingPercentage);
    }

}, [mode, defaultGeofenceId, selectedGeofenceId, fitLevel, centerMapOnAddress, mapAdapter]);

    useEffect(() => {
        if (!isLoading && mapAdapter) {
            setTimeout(() => applyZoomLevel(), 200);
        }
    }, [isLoading, applyZoomLevel, mapAdapter]);
    
  
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
    if (!feature) return;

    if (activeShapeState?.feature && vectorSourceRef.current) {
      if(vectorSourceRef.current.hasFeature(activeShapeState.feature)) {
        vectorSourceRef.current.removeFeature(activeShapeState.feature);
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
  }, [activeShapeState, vectorSourceRef, setActiveShapeState, setHistoryStack, setHistoryIndex]);
  
  if (!mapProvider) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-lg border bg-muted">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
                                <div className="flex items-center gap-2 text-lg text-muted-foreground">
                                    <Loader className="h-6 w-6 animate-spin" />
                                    <span>{t('condoDashboard.map.loadingMap')}</span>
                                </div>
                                </div>
                            )}
                            <MapContainer 
                                mapRef={mapRef}
                                vectorSourceRef={vectorSourceRef}
                                provider={mapProvider}
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
                            <Button onClick={() => mapAdapter?.zoomIn()} variant="ghost" size="icon" title="Zoom In">
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                            <Button onClick={() => mapAdapter?.zoomOut()} variant="ghost" size="icon" title="Zoom Out">
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
                                    mapAdapter={mapAdapter}
                                    mapRef={mapRef}
                                    historyStack={historyStack}
                                    setHistoryStack={setHistoryStack}
                                    historyIndex={historyIndex}
                                    setHistoryIndex={setHistoryIndex}
                                    geofenceSource={vectorSourceRef.current}
                                    drawingMode={drawingMode}
                                    setDrawingMode={setDrawingMode}
                                    setShapeBeingSaved={setShapeBeingSaved}
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
