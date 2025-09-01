

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Locate,
  ZoomIn,
  ZoomOut,
  Frame,
  Loader,
  Building
} from 'lucide-react';
import { fromLonLat } from 'ol/proj';
import type { Map } from 'ol';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from '@/lib/i18n';
import MapContainer from '@/components/map/map-container';
import { ElementsControls } from './elements-controls';
import { geocodeAddress } from '@/actions/geocoding';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import type { MapProvider } from '@/actions/map_providers';
import { GeofenceControls } from './geofence-controls';
import { getGeofencesByCondoId, type Geofence as DbGeofence } from '@/actions/maps';

export default function CondoMapTab({ condo, mapProvider }: { condo: Condominio, mapProvider: MapProvider | null }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<Map | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  
  const [condoPosition, setCondoPosition] = useState<{lat: number, lng: number} | null>(null);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>([]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  
  const onDataNeedsRefresh = useCallback(async (newSelectedId?: string) => {
    setIsLoading(true);
    try {
        const freshDbGeofences = await getGeofencesByCondoId(condo.id);
        setDbGeofences(freshDbGeofences);
        
        const defaultGfDb = freshDbGeofences.find(g => g.is_default);
        const newDefaultId = defaultGfDb ? defaultGfDb.id : (freshDbGeofences.length > 0 ? freshDbGeofences[0].id : null);
        
        if (newSelectedId) {
            setSelectedGeofenceId(newSelectedId);
        } else {
            const currentSelectionExists = freshDbGeofences.some(g => g.id === selectedGeofenceId);
            if (!currentSelectionExists) {
                setSelectedGeofenceId(newDefaultId);
            }
        }
        
        return { hasGeofences: freshDbGeofences.length > 0, defaultGeofence: defaultGfDb };

    } catch (e) {
        console.error("Failed to refresh data", e);
        toast({ title: t('toast.errorTitle'), description: "Error al recargar los datos del mapa.", variant: 'destructive' });
        return { hasGeofences: false, defaultGeofence: null };
    } finally {
        setIsLoading(false);
    }
  }, [condo.id, selectedGeofenceId, toast, t]);


  const fetchAndSetCondoPosition = useCallback(async (map: Map, suppressToast = false) => {
    setIsLoading(true);
    try {
        const geoResult = await geocodeAddress({
            street: `${condo.street}, ${condo.number}`, city: condo.city, state: condo.state, country: condo.country
        });
        if (geoResult.success && geoResult.data && geoResult.data.length > 0) {
            const location = geoResult.data[0].geometry.location;
            setCondoPosition(location);
            map.getView().setCenter(fromLonLat([location.lng, location.lat]));
            map.getView().setZoom(17);
        } else {
            if (!suppressToast) {
                toast({
                    title: t('toast.errorTitle'),
                    description: geoResult.message || 'Geocoding failed.',
                    variant: 'destructive'
                });
            } else {
                console.warn("Silent geocoding failure:", geoResult.message);
            }
        }
    } catch (error) {
         if (!suppressToast) {
            toast({
                title: t('toast.errorTitle'),
                description: "An error occurred during geocoding.",
                variant: 'destructive'
            });
        } else {
            console.error("Silent geocoding error:", error);
        }
    } finally {
        setIsLoading(false);
    }
  }, [condo, toast, t]);

  const centerMapOnStoredPosition = useCallback(() => {
    if (mapRef.current && condoPosition) {
        const view = mapRef.current.getView();
        view.animate({
            center: fromLonLat([condoPosition.lng, condoPosition.lat]),
            zoom: 17,
            duration: 500
        });
    } else if (mapRef.current) {
        fetchAndSetCondoPosition(mapRef.current);
    }
  }, [condoPosition, fetchAndSetCondoPosition]);


  const handleMapLoad = useCallback(async (map: Map) => {
    mapRef.current = map;
    
    // First, try to fit to a geofence
    const { hasGeofences, defaultGeofence } = await onDataNeedsRefresh();

    if (hasGeofences && defaultGeofence) {
        // TODO: Implement fitToGeofence logic for OpenLayers
        console.log("TODO: Fit map to geofence bounds", defaultGeofence);
        // For now, center on condo address as fallback
        await fetchAndSetCondoPosition(map, true);
    } else if (!hasGeofences) {
        // If no geofences, silently try to center on address
        await fetchAndSetCondoPosition(map, true);
    }
    
    map.getView().on('change:resolution', () => {
        const currentZoom = map.getView().getZoom();
        if (currentZoom) {
            setZoomLevel(Math.round(currentZoom));
        }
    });
    
    setIsLoading(false);

  }, [onDataNeedsRefresh, fetchAndSetCondoPosition]);

  const handleZoomIn = () => {
    const view = mapRef.current?.getView();
    if(view) view.animate({ zoom: view.getZoom()! + 1, duration: 250 });
  };
  const handleZoomOut = () => {
    const view = mapRef.current?.getView();
    if(view) view.animate({ zoom: view.getZoom()! - 1, duration: 250 });
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
                    <Button onClick={centerMapOnStoredPosition} variant="link" size="sm" className="p-0 h-auto">
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
                            <MapContainer provider={mapProvider} onMapLoad={handleMapLoad}>
                                <Building className="h-8 w-8 text-slate-700 drop-shadow-lg" />
                            </MapContainer>
                        </div>
                        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex flex-col items-center gap-1 backdrop-blur-sm">
                            <Button onClick={handleZoomIn} variant="ghost" size="icon" title="Zoom In">
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center select-none">{zoomLevel}</span>
                            <Button onClick={handleZoomOut} variant="ghost" size="icon" title="Zoom Out">
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" title={t('condoDashboard.map.geofence.fitBounds')} disabled>
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
                                    dbGeofences={dbGeofences}
                                    onDataNeedsRefresh={onDataNeedsRefresh}
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
            initialFitLevel={'2'}
            onApplyFit={() => {}}
            isGeofenceAvailable={false}
            onCenterAddress={centerMapOnStoredPosition}
        />
    </>
  );
}


