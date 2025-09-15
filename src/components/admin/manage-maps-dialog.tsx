

"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition, useRef } from 'react';
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
import { DropdownMenuItem, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
    TestTube2,
    Lock,
    Globe
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import MapContainer from '../map/map-container';

const IMMUTABLE_PROVIDER_ID = '00000000-0000-0000-0000-000000000001';


function TestMapProviderDialog({ provider, onOpenChange, initialPosition }: { provider: MapProvider | null, onOpenChange: (open: boolean) => void, initialPosition: { lat: number, lng: number } }) {
    const { t } = useLocale();
    const isOpen = !!provider;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.maps.testDialog.title')}: {provider?.name}</DialogTitle>
                    <DialogDescription>
                        {t('adminDashboard.maps.testDialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="h-[50vh] w-full rounded-lg border bg-muted my-4">
                    {provider && (
                         <MapContainer 
                            provider={provider} 
                            onMapLoad={() => {}}
                            initialPosition={initialPosition}
                        />
                    )}
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AddGoogleMapProviderDialog({ isOpen, onOpenChange, onSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [name, setName] = useState('Google Maps');

    const googleProviderJson = {
        api_config: {
            parameters: {
            apiKey: "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
            mapId: "DEMO_MAP_ID"
            }
        },
        ui_config: {
            attribution: "Google"
        }
    };
    
    const handleCreateGoogleProvider = async (prevState: any, formData: FormData) => {
        formData.set('provider_type', 'google');
        formData.set('config', JSON.stringify(googleProviderJson));

        const result = await createMapProvider(prevState, formData);
        if (result?.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        } else if(result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    }

    const [state, formAction] = useActionState(handleCreateGoogleProvider, undefined);
    const { pending } = useFormStatus();

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                 <form action={formAction}>
                    <div className={cn('relative', pending && 'opacity-50')}>
                        {pending && <LoadingOverlay text={t('adminDashboard.loadingOverlay.creating')} />}
                        <DialogHeader>
                            <DialogTitle>{t('adminDashboard.maps.addGoogleTitle')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.maps.addGoogleDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="name">{t('adminDashboard.maps.nameLabel')}</Label>
                            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={pending} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={pending || !name}>{t('common.create')}</Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

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
            if (typeof config === 'string') {
                return JSON.stringify(JSON.parse(config), null, 2);
            }
            return JSON.stringify(config, null, 2);
        } catch {
            return '';
        }
    };
    
    const [name, setName] = useState(service?.name || '');
    const [config, setConfig] = useState(isEditMode ? getInitialJson(service.config_json) : '');
    const [isJsonValid, setIsJsonValid] = useState(true);

    useEffect(() => {
        if(service) {
            setName(service.name);
            setConfig(getInitialJson(service.config_json));
        } else {
            setName('');
            setConfig('');
        }
    }, [service])

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setConfig(text);
        if (!text.trim()) {
            setIsJsonValid(true); 
            return;
        }
        try {
            const parsed = JSON.parse(text);
            setIsJsonValid(true);
        } catch (error) {
            setIsJsonValid(false);
        }
    };
    
    const getProviderTypeFromConfig = () => {
        try {
            const parsed = JSON.parse(config);
            return parsed?.provider_type || '';
        } catch {
            return '';
        }
    }

    const isCreateButtonDisabled = () => {
        if (pending) return true;
        if (!name || !isJsonValid) return true;
        return false;
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form action={dispatch}>
                    <div className={cn("relative transition-opacity")}>
                        {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? t('adminDashboard.maps.editTitle') : t('adminDashboard.maps.newTitle')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.maps.formDescription')}</DialogDescription>
                        </DialogHeader>
                        <input type="hidden" name="id" value={service?.id || ''} />
                        <input type="hidden" name="provider_type" value={getProviderTypeFromConfig()} />
                        
                        <div className="grid gap-4 py-4">
                             <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminDashboard.maps.nameLabel')}</Label>
                                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenLayers - Ruas" required disabled={pending}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="config">{t('adminDashboard.maps.configLabel')}</Label>
                                <Textarea 
                                    id="config"
                                    name="config"
                                    value={config}
                                    onChange={handleJsonChange}
                                    placeholder='{\n  "provider_type": "openlayers",\n  "api_config": {\n    "base_url": "...",\n    ...\n  }\n}'
                                    required 
                                    disabled={pending}
                                    className={cn("min-h-[150px] font-mono text-xs", !isJsonValid && "border-destructive focus-visible:ring-destructive")}
                                />
                                {!isJsonValid && <p className="text-sm text-destructive">{t('adminDashboard.maps.invalidJson')}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={isCreateButtonDisabled()}>
                                {pending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? t('common.saveChanges') : t('common.create')}
                            </Button>
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
  const [testingService, setTestingService] = useState<MapProvider | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGoogleFormOpen, setIsGoogleFormOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [editingService, setEditingService] = useState<MapProvider | null>(null);
  
  const testInitialPosition = { lat: -23.5505, lng: -46.6333 }; // São Paulo

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
      setIsGoogleFormOpen(false);
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

  const handleTest = (service: MapProvider) => {
      setTestingService(service);
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
            <div className={cn("relative")}>
                {isSubmitting && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
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
                        services.map((service) => {
                            const isImmutable = service.id === IMMUTABLE_PROVIDER_ID;
                            return (
                                <div 
                                    key={service.id} 
                                    className="flex items-center gap-2 p-2 border rounded-lg bg-card"
                                >
                                    {service.is_default && <Star className="h-5 w-5 text-orange-500 fill-orange-400" />}
                                    <div className="flex-grow">
                                        <p className="font-medium flex items-center gap-2">
                                            {service.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{service.provider_type}</p>
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
                                            <Button variant="ghost" size="icon" onClick={() => handleTest(service)} disabled={isSubmitting}>
                                                <TestTube2 className="h-4 w-4"/>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('adminDashboard.maps.test')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(service)} disabled={isSubmitting}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('common.edit')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isSubmitting || isImmutable}><Trash2 className="h-4 w-4"/></Button>
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
                            );
                        })
                    )}
                    </TooltipProvider>
                </div>
                
                <DialogFooter className="sm:justify-between">
                    <DialogClose asChild><Button variant="outline">{t('common.close')}</Button></DialogClose>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4"/>{t('adminDashboard.maps.addButton')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsGoogleFormOpen(true)}>
                                <Globe className="mr-2 h-4 w-4" /> Google Maps
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleCreateClick}>
                                <MapIcon className="mr-2 h-4 w-4" /> {t('adminDashboard.maps.addTileProvider')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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

      {isGoogleFormOpen && (
          <AddGoogleMapProviderDialog 
              isOpen={isGoogleFormOpen}
              onOpenChange={setIsGoogleFormOpen}
              onSuccess={onFormSuccess}
          />
      )}

      <TestMapProviderDialog 
        provider={testingService} 
        onOpenChange={() => setTestingService(null)} 
        initialPosition={testInitialPosition}
      />
    </>
  );
}
