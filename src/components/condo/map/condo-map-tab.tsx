

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Locate,
  ZoomIn,
  ZoomOut,
  Frame,
  Building,
  Loader,
} from 'lucide-react';
import { fromLonLat } from 'ol/proj';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from '@/lib/i18n';
import MapContainer from '@/components/map/map-container';
import { ElementsControls } from './elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import { geocodeAddress } from '@/actions/geocoding';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';

export default function CondoMapTab({ condo }: { condo: Condominio }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const mapRef = useRef<any | null>(null); // To hold OpenLayers map instance
  
  const [dbGeofences, setDbGeofences] = useState<DbGeofence[]>([]);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  
  const [condoPosition, setCondoPosition] = useState<{lat: number, lng: number} | null>(null);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');

  const onDataNeedsRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
        const freshDbGeofences = await getGeofencesByCondoId(condo.id);
        setDbGeofences(freshDbGeofences);
        
        const defaultGfDb = freshDbGeofences.find(g => g.is_default);
        const newDefaultId = defaultGfDb ? defaultGfDb.id : (freshDbGeofences.length > 0 ? freshDbGeofences[0].id : null);
        setDefaultGeofenceId(newDefaultId);
        
    } catch (e) {
        console.error("Failed to refresh data", e);
        toast({ title: t('toast.errorTitle'), description: "Error al recargar los datos del mapa.", variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [condo.id, toast, t]);

  const centerMapOnAddress = useCallback(async (zoom: boolean = true) => {
    const map = mapRef.current;
    if (!map) return;
  
    // Geocode only if we don't have the position yet
    if (!condoPosition) {
        const geoResult = await geocodeAddress({
            street: `${condo.street}, ${condo.number}`, city: condo.city, state: condo.state, country: condo.country
        });
        if (geoResult.success && geoResult.data && geoResult.data.length > 0) {
            const location = geoResult.data[0].geometry.location;
            setCondoPosition(location);
            map.getView().setCenter(fromLonLat([location.lng, location.lat]));
            if (zoom) map.getView().setZoom(17);
        } else {
            toast({
                title: t('toast.errorTitle'),
                description: geoResult.message || 'Geocoding failed.',
                variant: 'destructive'
            });
        }
    } else {
        map.getView().setCenter(fromLonLat([condoPosition.lng, condoPosition.lat]));
        if (zoom) map.getView().setZoom(17);
    }
 }, [condo, condoPosition, setCondoPosition, t, toast]);


  const handleMapLoad = useCallback(async (map: any) => {
    mapRef.current = map;
    await onDataNeedsRefresh();
    await centerMapOnAddress();
    
    // Listen for zoom changes
    map.getView().on('change:resolution', () => {
        setZoomLevel(Math.round(map.getView().getZoom()!));
    });

  }, [onDataNeedsRefresh, centerMapOnAddress]);

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
                    <Button onClick={() => centerMapOnAddress(true)} variant="link" size="sm" className="p-0 h-auto">
                        <Locate className="h-3 w-3 mr-1" />
                        {t('condoDashboard.map.recenterOnAddress')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 h-[70vh]">
                    <div className="col-span-1 md:col-span-2 relative p-1">
                        <div className="relative h-full w-full bg-muted overflow-hidden shadow-inner rounded-md border">
                            <MapContainer onMapLoad={handleMapLoad}>
                               {/* Markers and polygons will be added here as children */}
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
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-sm p-4">
                                     <Loader className="h-6 w-6 animate-spin mb-4" />
                                    <p>{t('condoDashboard.settingsGroups.catalogs.wipDescription')}</p>
                                    <p>Geofence controls will be reimplemented using OpenLayers soon.</p>
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
            initialFitLevel={'2'}
            onApplyFit={() => {}}
            isGeofenceAvailable={false}
            onCenterAddress={() => centerMapOnAddress(true)}
        />
    </>
  );
}
