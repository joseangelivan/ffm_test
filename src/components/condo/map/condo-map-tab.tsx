

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import {
  Locate,
  ZoomIn,
  ZoomOut,
  Frame,
  Loader,
  Building,
  PlusCircle,
  Edit,
  Trash2,
  Save,
  Star,
  XCircle,
  Eye,
  EyeOff,
  PenSquare,
} from 'lucide-react';
import { fromLonLat } from 'ol/proj';
import type { Map } from 'ol';

import type { Condominio } from '@/actions/condos';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/lib/i18n';
import MapContainer from '@/components/map/map-container';
import { ElementsControls } from './elements-controls';
import { geocodeAddress } from '@/actions/geocoding';
import { MapSettingsDialog } from './map-settings-dialog';
import { useToast } from '@/hooks/use-toast';
import type { MapProvider } from '@/actions/map_providers';
import { 
    getGeofencesByCondoId,
    setCondoDefaultGeofence,
    createGeofence,
    updateGeofence,
    deleteGeofence,
    type Geofence as DbGeofence 
} from '@/actions/maps';
import { cn } from '@/lib/utils';

const CreateEditGeofenceDialog = ({ condoId, geofence, onSuccess, onOpenChange, isOpen }: { condoId: string, geofence?: DbGeofence | null, onSuccess: (newId?: string) => void, onOpenChange: (isOpen: boolean) => void, isOpen: boolean }) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const [name, setName] = useState(geofence?.name || '');
    const [isDefault, setIsDefault] = useState(geofence?.is_default || false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if(isOpen) {
            setName(geofence?.name || '');
            setIsDefault(geofence?.is_default || false);
        }
    }, [isOpen, geofence]);

    const handleSubmit = () => {
        startTransition(async () => {
            const geometry = {}; // Placeholder for OpenLayers drawn geometry
            let result;
            if (geofence) {
                // Update logic
                result = await updateGeofence(geofence.id, { name, geometry });
            } else {
                // Create logic
                result = await createGeofence({ condoId, name, geometry, isDefault });
            }

            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onSuccess(result.data?.id);
                onOpenChange(false);
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                 <div className={cn('relative', isPending && 'opacity-50 pointer-events-none')}>
                    {isPending && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50"><Loader className="animate-spin" /></div>}
                    <DialogHeader>
                        <DialogTitle>{geofence ? t('common.edit') : t('common.create')} {t('condoDashboard.map.modules.geofence')}</DialogTitle>
                        <DialogDescription>{t('condoDashboard.users.createDialog.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('addDeviceDialog.nameLabel')}</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('condoDashboard.map.geofence.defaultName')} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="is-default" checked={isDefault} onCheckedChange={(checked) => setIsDefault(!!checked)} />
                            <Label htmlFor="is-default">{t('condoDashboard.map.geofence.setAsDefault')}</Label>
                        </div>
                         <div className="pt-4 border-t text-center text-muted-foreground text-sm">
                            <p>{t('condoDashboard.map.wipDescription')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
                        <Button onClick={handleSubmit} disabled={!name || isPending}>{t('common.save')}</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};


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
  
  const [mode, setMode] = useState<'view' | 'drawing' | 'editing'>('view');
  const [shapeType, setShapeType] = useState<'Polygon' | 'Rectangle' | 'Circle'>('Polygon');
  const [showAllGeofences, setShowAllGeofences] = useState(false);
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(false);
  
  const [isSubmitting, startSubmittingTransition] = useTransition();

  const [isCreateGeofenceDialogOpen, setIsCreateGeofenceDialogOpen] = useState(false);
  const [isEditGeofenceDialogOpen, setIsEditGeofenceDialogOpen] = useState(false);
  
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
                toast({ title: t('toast.errorTitle'), description: geoResult.message || 'Geocoding failed.', variant: 'destructive' });
             } else {
                console.warn("Silent geocoding failure:", geoResult.message);
            }
        }
    } catch (error) {
        if (!suppressToast) {
            toast({ title: t('toast.errorTitle'), description: "An error occurred during geocoding.", variant: 'destructive'});
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
    
    const { hasGeofences } = await onDataNeedsRefresh();

    if (!hasGeofences) {
        await fetchAndSetCondoPosition(map, true);
    } else {
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

  const handleSetDefault = (geofenceId: string) => {
    startSubmittingTransition(async () => {
        const result = await setCondoDefaultGeofence(condoId, geofenceId);
        if (result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onDataNeedsRefresh(geofenceId);
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
    });
  };

  const handleDelete = (geofenceId: string) => {
      startSubmittingTransition(async () => {
          const result = await deleteGeofence(geofenceId);
          if (result.success) {
              toast({ title: t('toast.successTitle'), description: result.message });
              onDataNeedsRefresh();
          } else {
              toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
          }
      });
  }

  const isActionBusy = isSubmitting;
  
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
                               <div className="space-y-4 pt-2 border-t mt-4 flex-grow flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base font-semibold">{t('condoDashboard.map.modules.geofence')}</h3>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="show-all" checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)} />
                                            <Label htmlFor="show-all" className="text-xs">{t('condoDashboard.map.geofence.viewAll')}</Label>
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
                                                {dbGeofences.map(gf => (
                                                    <SelectItem key={gf.id} value={gf.id}>{gf.name}{gf.is_default ? ` (${t('common.default')})` : ''}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" disabled={isActionBusy} onClick={() => setIsCreateGeofenceDialogOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4"/>{t('common.create')}
                                        </Button>
                                        <Button variant="outline" disabled={!selectedGeofenceId || isActionBusy} onClick={() => setIsEditGeofenceDialogOpen(true)}>
                                            <Edit className="mr-2 h-4 w-4"/>{t('common.edit')}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" disabled={!selectedGeofenceId || isActionBusy}>
                                                    <Trash2 className="mr-2 h-4 w-4"/>{t('common.delete')}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {t('condoDashboard.users.deleteConfirmation', {name: dbGeofences.find(g => g.id === selectedGeofenceId)?.name || ''})}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(selectedGeofenceId!)}>{t('common.delete')}</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button variant="secondary" onClick={() => handleSetDefault(selectedGeofenceId!)} disabled={!selectedGeofenceId || dbGeofences.find(g => g.id === selectedGeofenceId)?.is_default || isActionBusy}>
                                            <Star className="mr-2 h-4 w-4"/>{t('condoDashboard.map.geofence.setAsDefault')}
                                        </Button>
                                    </div>
                                    
                                    <fieldset className="border rounded-md p-4 pt-2 space-y-4">
                                        <legend className="-ml-1 px-1 text-sm font-medium text-muted-foreground flex items-center">
                                             <Checkbox id="enable-edit-mode" checked={isEditModeEnabled} onCheckedChange={setIsEditModeEnabled} />
                                             <Label htmlFor="enable-edit-mode" className="ml-2 font-semibold text-foreground">{t('adminDashboard.settingsGroups.catalogs.deviceTypes.editMode')}</Label>
                                        </legend>
                                        <div className="space-y-4" hidden={!isEditModeEnabled}>
                                            <Select value={shapeType} onValueChange={(v) => setShapeType(v as any)} disabled={mode !== 'view'}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Polygon">{t('condoDashboard.map.shapes.polygon')}</SelectItem>
                                                    <SelectItem value="Rectangle">{t('condoDashboard.map.shapes.rectangle')}</SelectItem>
                                                    <SelectItem value="Circle">{t('condoDashboard.map.shapes.circle')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="grid grid-cols-1 gap-2">
                                                 {mode === 'view' ? (
                                                    <Button disabled><PenSquare className="h-4 w-4 mr-2" />{t('condoDashboard.map.geofence.draw')} {shapeType}</Button>
                                                 ) : (
                                                    <>
                                                        <Button><Save className="h-4 w-4 mr-2"/> {t('condoDashboard.map.geofence.saveButton')}</Button>
                                                        <Button variant="ghost"><XCircle className="h-4 w-4 mr-2"/> {t('common.cancel')}</Button>
                                                    </>
                                                 )}
                                            </div>
                                        </div>
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
            initialFitLevel={'2'}
            onApplyFit={() => {}}
            isGeofenceAvailable={false}
            onCenterAddress={centerMapOnStoredPosition}
        />
        <CreateEditGeofenceDialog 
            condoId={condo.id}
            isOpen={isCreateGeofenceDialogOpen}
            onOpenChange={setIsCreateGeofenceDialogOpen}
            onSuccess={(newId) => { onDataNeedsRefresh(newId); }}
        />
        <CreateEditGeofenceDialog 
            condoId={condo.id}
            geofence={dbGeofences.find(g => g.id === selectedGeofenceId)}
            isOpen={isEditGeofenceDialogOpen}
            onOpenChange={setIsEditGeofenceDialogOpen}
            onSuccess={() => onDataNeedsRefresh(selectedGeofenceId!)}
        />
    </>
  );
}

