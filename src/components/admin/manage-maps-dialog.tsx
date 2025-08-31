

"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    createMapProvider,
    getMapProviders,
    updateMapProvider,
    deleteMapProvider,
    setMapProviderAsDefault,
    type MapProvider
} from '@/actions/map_providers';
import { 
    Map as MapIcon,
    Star,
    Loader,
    Edit,
    Trash2,
    PlusCircle,
    TestTube2
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

function ServiceFormDialog({ isOpen, onOpenChange, service, onSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, service: MapProvider | null, onSuccess: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!service;
    const formAction = isEditMode ? updateMapProvider : createMapProvider;
    
    const onFormSuccessCallback = useCallback(() => {
        onSuccess();
    }, [onSuccess]);

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result?.success === false) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        if (result?.success === true) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onFormSuccessCallback();
        }
        return result;
    }
    
    const [state, dispatch] = useActionState(handleAction, undefined);
    const { pending } = useFormStatus();

    const getInitialJson = (config: any) => {
        if (!config) return '';
        try {
            return JSON.stringify(config, null, 2);
        } catch {
            return '';
        }
    };
    
    const [config, setConfig] = useState(
        isEditMode ? getInitialJson(service.config_json) : ''
    );

    const [isJsonValid, setIsJsonValid] = useState(true);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setConfig(text);
        if (!text.trim()) {
            setIsJsonValid(true); 
            return;
        }
        try {
            JSON.parse(text);
            setIsJsonValid(true);
        } catch (error) {
            setIsJsonValid(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form action={dispatch}>
                    <div className={cn("relative transition-opacity", pending && "opacity-50")}>
                        {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? t('adminDashboard.maps.editTitle') : t('adminDashboard.maps.newTitle')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.maps.formDescription')}</DialogDescription>
                        </DialogHeader>
                        <input type="hidden" name="id" value={service?.id || ''} />

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminDashboard.maps.nameLabel')}</Label>
                                <Input id="name" name="name" defaultValue={service?.name} placeholder="Google Maps" required disabled={pending}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="provider_type">{t('adminDashboard.maps.typeLabel')}</Label>
                                <Select name="provider_type" defaultValue={service?.provider_type || 'google'} disabled={pending}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="google">Google Maps</SelectItem>
                                        <SelectItem value="leaflet" disabled>Leaflet (OpenStreetMap)</SelectItem>
                                        <SelectItem value="mapbox" disabled>Mapbox</SelectItem>
                                        <SelectItem value="openlayers" disabled>OpenLayers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="config">{t('adminDashboard.maps.configLabel')}</Label>
                                <Textarea 
                                    id="config"
                                    name="config"
                                    value={config}
                                    onChange={handleJsonChange}
                                    placeholder='{ "apiKey": "$ENV_VAR_NAME", "mapId": "YOUR_MAP_ID" }' 
                                    required 
                                    disabled={pending}
                                    className={cn("min-h-[150px] font-mono text-xs", !isJsonValid && "border-destructive focus-visible:ring-destructive")}
                                />
                                {!isJsonValid && <p className="text-sm text-destructive">{t('adminDashboard.maps.invalidJson')}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={pending || !isJsonValid}>{isEditMode ? t('common.saveChanges') : t('common.create')}</Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function ManageMapsDialog() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [services, setServices] = useState<MapProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [editingService, setEditingService] = useState<MapProvider | null>(null);
  
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
        const result = await getMapProviders();
        setServices(Array.isArray(result) ? result : []);
    } catch (e) {
        setServices([]);
        console.error("Failed to fetch map providers", e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isListOpen) {
        fetchServices();
    }
  }, [fetchServices, isListOpen]);

  const onFormSuccess = useCallback(() => {
      setIsFormOpen(false);
      setEditingService(null);
      fetchServices();
  }, [fetchServices]);

  const handleEditClick = (service: MapProvider) => {
      setEditingService(service);
      setIsFormOpen(true);
  };
  
    const handleCreateClick = () => {
        setEditingService(null);
        setIsFormOpen(true);
    };

  const handleDelete = (id: string) => {
    startSubmitting(async () => {
       const result = await deleteMapProvider(id);
       if(result.success) {
           toast({ title: t('toast.successTitle'), description: result.message });
           fetchServices();
       } else {
           toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
       }
    });
  }

  const handleSetDefault = (id: string) => {
    startSubmitting(async () => {
        const result = await setMapProviderAsDefault(id);
        if(result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            fetchServices();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
    });
  }

  const handleTest = (id: string) => {
      toast({ title: "Función no disponible", description: "La prueba de proveedores de mapas se implementará próximamente."})
  }

  return (
    <>
      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <MapIcon className="mr-2 h-4 w-4" />
                <span>{t('adminDashboard.maps.title')}</span>
            </DropdownMenuItem>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
            <div className={cn("relative", (isSubmitting && !testingId) && "opacity-50")}>
                {(isSubmitting && !testingId) && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.maps.title')}</DialogTitle>
                    <DialogDescription>
                        {t('adminDashboard.maps.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <TooltipProvider>
                    {isLoading ? (
                        Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : services.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">{t('adminDashboard.maps.noServices')}</p>
                    ) : (
                        services.map((service) => (
                            <div 
                                key={service.id} 
                                className="flex items-center gap-2 p-2 border rounded-lg bg-card"
                            >
                                {service.is_default && <Star className="h-5 w-5 text-orange-500 fill-orange-400" />}
                                <div className="flex-grow">
                                    <p className="font-medium">{service.name}</p>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isSubmitting || service.is_default} onClick={() => handleSetDefault(service.id)}>
                                            <Star className={cn("h-4 w-4", service.is_default && "fill-orange-400 text-orange-500")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('adminDashboard.maps.setAsDefault')}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleTest(service.id)} disabled={isSubmitting}>
                                            {testingId === service.id ? (
                                                <Loader className="h-4 w-4 animate-spin"/>
                                            ) : (
                                                <TestTube2 className="h-4 w-4"/>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('adminDashboard.maps.test')}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(service)} disabled={isSubmitting}><Edit className="h-4 w-4"/></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('common.edit')}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isSubmitting}><Trash2 className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                        </AlertDialogTrigger>
                                         <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                <AlertDialogDescription>{t('adminDashboard.maps.deleteConfirmation', { name: service.name })}</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(service.id)} className={buttonVariants({variant: 'destructive'})}>{t('common.delete')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <TooltipContent>
                                        <p>{t('common.delete')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        ))
                    )}
                    </TooltipProvider>
                </div>
                
                <DialogFooter className="sm:justify-between">
                    <DialogClose asChild><Button variant="outline">{t('common.close')}</Button></DialogClose>
                    <Button onClick={handleCreateClick}>
                        <PlusCircle className="mr-2 h-4 w-4"/>{t('adminDashboard.maps.addButton')}
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>
      
      {isFormOpen && (
        <ServiceFormDialog 
            isOpen={isFormOpen} 
            onOpenChange={setIsFormOpen} 
            service={editingService} 
            onSuccess={onFormSuccess} 
        />
      )}
    </>
  );
}
