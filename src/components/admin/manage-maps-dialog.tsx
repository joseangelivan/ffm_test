

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
    TestTube2,
    Lock
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const IMMUTABLE_PROVIDER_ID = '00000000-0000-0000-0000-000000000001';

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
    const [providerType, setProviderType] = useState(service?.provider_type || '');
    const [isJsonValid, setIsJsonValid] = useState(true);

    useEffect(() => {
        if(service) {
            setProviderType(service.provider_type);
        } else {
            setProviderType('');
        }
    }, [service])

    const handleLoadConfig = () => {
        try {
            const parsedConfig = JSON.parse(config);
            const extractedProvider = parsedConfig?.api_config?.provider;
            if (extractedProvider && typeof extractedProvider === 'string') {
                setProviderType(extractedProvider);
                toast({ title: t('toast.successTitle'), description: `Provider "${extractedProvider}" carregado com sucesso.`});
            } else {
                setProviderType('');
                toast({ title: t('toast.errorTitle'), description: 'A chave "provider" não foi encontrada ou é inválida no JSON.', variant: 'destructive'});
            }
        } catch (e) {
            setProviderType('');
            setIsJsonValid(false);
            toast({ title: t('toast.errorTitle'), description: t('adminDashboard.maps.invalidJson'), variant: 'destructive'});
        }
    };

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

    const isCreateButtonDisabled = () => {
        if (pending) return true;
        if (isEditMode) return !isJsonValid; // In edit mode, provider type is fixed.
        return !providerType || !name || !isJsonValid;
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
                        <input type="hidden" name="provider_type" value={providerType} />

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
                                    placeholder='{\n  "api_config": {\n    "provider": "openlayers",\n    ...\n  }\n}'
                                    required 
                                    disabled={pending}
                                    className={cn("min-h-[150px] font-mono text-xs", !isJsonValid && "border-destructive focus-visible:ring-destructive")}
                                />
                                {!isJsonValid && <p className="text-sm text-destructive">{t('adminDashboard.maps.invalidJson')}</p>}
                            </div>

                             <div className="grid grid-cols-3 gap-2 items-end">
                                <Button type="button" variant="outline" className="col-span-1" onClick={handleLoadConfig} disabled={pending || isEditMode}>
                                    {t('adminDashboard.maps.loadConfigButton')}
                                 </Button>
                                <div className="grid gap-2 col-span-2">
                                    <Label htmlFor="provider_type_display">{t('adminDashboard.maps.typeLabel')}</Label>
                                    <Input id="provider_type_display" value={providerType} readOnly disabled placeholder={t('adminDashboard.maps.typeExtractedPlaceholder')} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={isCreateButtonDisabled()}>{isEditMode ? t('common.saveChanges') : t('common.create')}</Button>
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
