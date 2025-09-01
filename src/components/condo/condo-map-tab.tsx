

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
import MapContainer from '@/components/map/map-container';
import { ElementsControls } from './map/elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map/map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export default function CondoMapTab({ condo }: { condo: Condominio }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<any | null>(null);
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>([]);
  
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'view' | 'editing'>('view');
  
  const [showAllGeofences, setShowAllGeofences] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(15);
  const [fitLevel, setFitLevel] = useState<'1' | '2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(true);

  const [calculatedZoomLevels, setCalculatedZoomLevels] = useState<{ tight: number, normal: number, wide: number } | null>(null);
  
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');

  // --- History State Management ---
  const activeShapeRef = useRef<{ id: string, shape: any | null, originalGeometry?: any } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  
  useEffect(() => {
    setHistoryState({
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
    });
  }, [historyIndex, history]);

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
    if(!map || !condo.address) return;
    // This function will need to be provider-agnostic
    // For now, it assumes a Google-like map object
    if(map.setCenter && map.setZoom) {
        // Here we would need to geocode the address if we don't have lat/lng
        // For simplicity, let's assume we get lat/lng with the condo data
    }
  }, [condo.address]);


  const handleMapLoad = useCallback(async (map: any) => {
    mapRef.current = map;
    await onDataNeedsRefresh();
  }, [onDataNeedsRefresh]);

    
  const handleHistoryAction = (action: 'undo' | 'redo') => {
    // This logic will need to be implemented within the specific map provider component
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
                                onMapLoad={handleMapLoad}
                            >
                                <Building className="h-8 w-8 text-slate-700 drop-shadow-lg" />
                            </MapContainer>
                        </div>
                         {activeShapeRef.current && (historyState.canUndo || historyState.canRedo) && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex items-center gap-1 backdrop-blur-sm">
                                <Button onClick={() => handleHistoryAction('undo')} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!historyState.canUndo}>
                                    <Undo className="h-4 w-4"/>
                                    {t('condoDashboard.map.undo')}
                                </Button>
                                <Button onClick={() => handleHistoryAction('redo')} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!historyState.canRedo}>
                                    <Redo className="h-4 w-4"/>
                                    {t('condoDashboard.map.redo')}
                                </Button>
                            </div>
                         )}
                        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex flex-col items-center gap-1 backdrop-blur-sm">
                            <Button onClick={() => {}} variant="ghost" size="icon" title="Zoom In">
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                            <Button onClick={() => {}} variant="ghost" size="icon" title="Zoom Out">
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <Button onClick={() => {}} variant="ghost" size="icon" title={t('condoDashboard.map.geofence.fitBounds')} disabled={!defaultGeofenceId}>
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
                                 <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-sm p-4">
                                     <Loader className="h-6 w-6 animate-spin mb-4" />
                                    <p>{t('condoDashboard.settingsGroups.catalogs.wipDescription')}</p>
                                    <p>La gestión de geocercas está siendo refactorizada para el nuevo sistema de mapas.</p>
                                </div>
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
            onApplyFit={() => {}}
            isGeofenceAvailable={!!calculatedZoomLevels}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}
