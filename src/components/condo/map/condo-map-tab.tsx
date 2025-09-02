
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
  PenSquare,
  PlusCircle,
  Save,
  XCircle,
  Settings,
  Star,
  Trash2,
  Eye,
  EyeOff,
  Edit
} from 'lucide-react';

import type { Condominio } from '@/actions/condos';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from '@/lib/i18n';
import { ElementsControls } from './elements-controls';
import { getGeofencesByCondoId } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import MapContainer from '@/components/map/map-container';
import type { MapProvider as DbMapProvider } from '@/actions/map_providers';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { 
    setCondoDefaultGeofence,
    createGeofence,
    updateGeofence,
    deleteGeofence,
} from '@/actions/maps';

interface CondoMapTabProps {
  condo: Condominio;
  initialPosition: { lat: number; lng: number };
  provider: DbMapProvider;
}

export default function CondoMapTab({ condo, initialPosition, provider }: CondoMapTabProps) {
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
  
  const [condoAddressPosition] = useState(initialPosition);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('geofence');
  const [isPending, startTransition] = useTransition();

  const [isEditMode, setIsEditMode] = useState(false);
  const [shapeType, setShapeType] = useState('Polygon');

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
    // This will need to be implemented for OpenLayers
  }, [condoAddressPosition]);

  const applyZoomLevel = useCallback(() => {
    // This will need to be implemented for OpenLayers
  }, []);

  const handleMapLoad = useCallback(async (map: any) => {
      mapRef.current = map;
      await onDataNeedsRefresh();
  }, [onDataNeedsRefresh]);

    useEffect(() => {
        if (!isLoading && mapRef.current) {
            applyZoomLevel();
        }
    }, [isLoading, applyZoomLevel]);

  const handleZoomIn = () => mapRef.current?.getView().setZoom(mapRef.current.getView().getZoom() + 1);
  const handleZoomOut = () => mapRef.current?.getView().setZoom(mapRef.current.getView().getZoom() - 1);

    const getGeofenceName = (gf: DbGeofence, isDefault: boolean, t: (key: string) => string) => {
        return `${gf.name}${isDefault ? ` (${t('common.default')})` : ''}`;
    };

    const handleSetDefault = (geofenceId: string) => {
        startTransition(async () => {
            const result = await setCondoDefaultGeofence(condo.id, geofenceId);
            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onDataNeedsRefresh(geofenceId);
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };

    const handleDelete = (geofenceId: string) => {
      startTransition(async () => {
          const result = await deleteGeofence(geofenceId);
          if (result.success) {
              toast({ title: t('toast.successTitle'), description: result.message });
              onDataNeedsRefresh();
          } else {
              toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
          }
      });
  };

  const defaultGeofenceName = dbGeofences.find(gf => gf.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');

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
                            >
                                {/* Children can be used for markers in OpenLayers too */}
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
                                <div className="space-y-4 pt-4 border-t mt-4 flex-grow flex flex-col">
                                    <div className="grid grid-cols-2 gap-4 items-end">
                                      <div>
                                          <Label htmlFor='default-geofence-display'>{t('condoDashboard.map.geofence.defaultLabel')}</Label>
                                          <Input id='default-geofence-display' value={defaultGeofenceName} readOnly />
                                      </div>
                                      <div className="flex items-center space-x-2 pb-2">
                                          <Checkbox id="show-all" checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)} />
                                          <Label htmlFor="show-all">{t('condoDashboard.map.geofence.viewAll')}</Label>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>{t('condoDashboard.map.geofence.selectPlaceholder')}</Label>
                                        <Select
                                            value={selectedGeofenceId || ''}
                                            onValueChange={setSelectedGeofenceId}
                                            disabled={showAllGeofences}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('condoDashboard.map.geofence.selectPlaceholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dbGeofences.map((gf: DbGeofence) => (
                                                    <SelectItem key={gf.id} value={gf.id}>{getGeofenceName(gf, gf.id === defaultGeofenceId, t)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" disabled={isPending} onClick={() => {}}><PlusCircle className="mr-2 h-4 w-4"/>{t('common.create')}</Button>
                                        <Button variant="outline" disabled={!selectedGeofenceId || isPending} onClick={() => {}}><Edit className="mr-2 h-4 w-4"/>{t('common.edit')}</Button>
                                        <Button variant="secondary" onClick={() => handleSetDefault(selectedGeofenceId!)} disabled={!selectedGeofenceId || selectedGeofenceId === defaultGeofenceId || isPending}><Star className="mr-2 h-4 w-4"/>{t('condoDashboard.map.geofence.setAsDefault')}</Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" disabled={!selectedGeofenceId || isPending}><Trash2 className="mr-2 h-4 w-4"/>{t('common.delete')}</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle><AlertDialogDescription>{t('condoDashboard.users.deleteConfirmation', {name: dbGeofences.find((g: DbGeofence) => g.id === selectedGeofenceId)?.name || ''})}</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(selectedGeofenceId!)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    
                                    <fieldset className="border rounded-md p-4 pt-2 space-y-4 mt-auto">
                                        <legend className="-ml-1 px-1 text-sm font-medium flex items-center">
                                            <Label htmlFor="enable-editing" className="ml-2 font-semibold text-foreground">{t('adminDashboard.settingsGroups.catalogs.deviceTypes.editMode')}</Label>
                                        </legend>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="enable-editing" checked={isEditMode} onCheckedChange={(checked) => setIsEditMode(!!checked)} />
                                            <Label htmlFor="enable-editing">Habilitar edição</Label>
                                        </div>
                                        {isEditMode && (
                                            <div className="space-y-4 animate-in fade-in-50">
                                                <Select value={shapeType} onValueChange={(v) => setShapeType(v as any)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value='Polygon'>{t('condoDashboard.map.shapes.polygon')}</SelectItem>
                                                        <SelectItem value='Rectangle'>{t('condoDashboard.map.shapes.rectangle')}</SelectItem>
                                                        <SelectItem value='Circle'>{t('condoDashboard.map.shapes.circle')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Button><PenSquare className="h-4 w-4 mr-2" />{t('condoDashboard.map.geofence.draw')} {shapeType}</Button>
                                                    <Button><Save className="h-4 w-4 mr-2"/> {t('condoDashboard.map.geofence.saveButton')}</Button>
                                                    <Button onClick={()=> setIsEditMode(false)} variant="ghost"><XCircle className="h-4 w-4 mr-2"/> {t('common.cancel')}</Button>
                                                </div>
                                            </div>
                                        )}
                                    </fieldset>
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
            onApplyFit={(level) => setFitLevel(level)}
            isGeofenceAvailable={!!defaultGeofenceId}
            onCenterAddress={centerMapOnAddress}
        />
    </>
  );
}

    