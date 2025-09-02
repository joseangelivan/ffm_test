

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
import { GeofenceControls } from './geofence-controls';
import { ElementsControls } from './elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import MapContainer from '@/components/map/map-container';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';

import type { Map as OlMap } from 'ol';
import type { Vector as VectorSource } from 'ol/source';
import type { Draw } from 'ol/interaction';
import type Feature from 'ol/Feature';
import { fromLonLat } from 'ol/proj';


interface CondoMapTabProps {
  condo: Condominio & { geofences: DbGeofence[] };
  initialPosition: { lat: number; lng: number };
  provider: DbMapProvider;
}

export default function CondoMapTab({ condo, initialPosition, provider }: CondoMapTabProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  
  // --- Refs ---
  const mapRef = useRef<OlMap | null>(null);
  const geofenceSourceRef = useRef<VectorSource | null>(null);
  const drawingInteractionRef = useRef<Draw | null>(null);
  const mapInitialized = useRef(false);

  // --- State ---
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>(condo.geofences);
  
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(() => 
    condo.geofences.find(g => g.is_default)?.id || (condo.geofences.length > 0 ? condo.geofences[0].id : null)
  );
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(() => 
    condo.geofences.find(g => g.is_default)?.id || (condo.geofences.length > 0 ? condo.geofences[0].id : null)
  );

  const [mode, setMode] = useState<'view' | 'editing'>('view');
  const [showAllGeofences, setShowAllGeofences] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(true);
  const [condoAddressPosition] = useState(initialPosition);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');
  const [activeShapeState, setActiveShapeState] = useState<{ id: string, feature: Feature | null, originalGeometry?: any } | null>(null);
  
  // --- Data Fetching & Refreshing ---
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

  // --- Map Interactions ---
  const centerMapOnAddress = useCallback(() => {
    const map = mapRef.current;
    if(!map || !condoAddressPosition) return;
    map.getView().animate({
        center: fromLonLat([condoAddressPosition.lng, condoAddressPosition.lat]),
        zoom: 17,
        duration: 800,
    });
  }, [condoAddressPosition]);

  const applyZoomLevel = useCallback(() => {
    const map = mapRef.current;
    const source = geofenceSourceRef.current;
    let geofenceIdToFit: string | null;

    if (mode === 'view') {
        geofenceIdToFit = defaultGeofenceId;
    } else {
        geofenceIdToFit = selectedGeofenceId || defaultGeofenceId;
    }
    
    if (!map || !source || !geofenceIdToFit) {
        if(map) centerMapOnAddress();
        return;
    }

    const featureToFit = source.getFeatureById(geofenceIdToFit);
    if (!featureToFit) return;

    const extent = featureToFit.getGeometry()?.getExtent();
    if (extent) {
        let paddingPercentage = 0.1; // 10% padding (normal)
        if (fitLevel === '1') paddingPercentage = 0.05; // 5% padding (tight)
        if (fitLevel === '3') paddingPercentage = 0.2; // 20% padding (wide)

        const padding = map.getSize()!.map(s => s * paddingPercentage);

        map.getView().fit(extent, {
            padding: [padding[1], padding[0], padding[1], padding[0]],
            duration: 800,
            maxZoom: 20
        });
    }
}, [mode, defaultGeofenceId, selectedGeofenceId, fitLevel, centerMapOnAddress]);


  const handleMapLoad = useCallback(async (map: OlMap, source: VectorSource) => {
    if (mapInitialized.current) return;
    mapInitialized.current = true;
    
    mapRef.current = map;
    geofenceSourceRef.current = source;
    
    map.on('moveend', () => {
        const zoom = map.getView().getZoom();
        if (zoom) setZoomLevel(Math.round(zoom));
    });
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
      if (!isLoading && mapRef.current) {
          applyZoomLevel();
      }
  }, [isLoading, applyZoomLevel]);
    
  const handleZoomIn = () => mapRef.current?.getView().setZoom(mapRef.current.getView().getZoom()! + 1);
  const handleZoomOut = () => mapRef.current?.getView().setZoom(mapRef.current.getView().getZoom()! - 1);
  
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
                                dbGeofences={dbGeofences}
                                activeShapeState={activeShapeState}
                                showAllGeofences={showAllGeofences}
                                selectedGeofenceId={selectedGeofenceId}
                                defaultGeofenceId={defaultGeofenceId}
                                mode={mode}
                                initialPosition={initialPosition}
                                mapRef={mapRef}
                            />
                        </div>
                         {activeShapeState && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex items-center gap-1 backdrop-blur-sm">
                                <Button variant="ghost" size="sm" className="flex items-center gap-2" disabled={true}>
                                    <Undo className="h-4 w-4"/>
                                    {t('condoDashboard.map.undo')}
                                </Button>
                                <Button variant="ghost" size="sm" className="flex items-center gap-2" disabled={true}>
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
                                    mapRef={mapRef}
                                    drawingInteractionRef={drawingInteractionRef}
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
                applyZoomLevel();
            }}
            isGeofenceAvailable={!!defaultGeofenceId}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}
