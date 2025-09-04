

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
    createGeocodingService,
    getGeocodingServices,
    updateGeocodingService,
    deleteGeocodingService,
    setGeocodingServiceAsDefault,
    testGeocodingService,
    type GeocodingService
} from '@/actions/geocoding';
import { 
    MapPin,
    Star,
    Loader,
    Edit,
    Trash2,
    PlusCircle,
    TestTube2
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

function ServiceFormFields({ service, onCancel }: { service: GeocodingService | null, onCancel: () => void}) {
    const { pending } = useFormStatus();
    const isEditMode = !!service;
    const { t } = useLocale();

    const getInitialJson = (config: any) => {
        if (!config) return '';
        try {
            return JSON.stringify(config, null, 2);
        } catch {
            return '';
        }
    };
    
    const [requestConfig, setRequestConfig] = useState(
        isEditMode ? getInitialJson(service.config_json?.request) : ''
    );
    const [responseConfig, setResponseConfig] = useState(
       isEditMode ? getInitialJson(service.config_json?.response) : ''
    );

    const [isRequestJsonValid, setIsRequestJsonValid] = useState(true);
    const [isResponseJsonValid, setIsResponseJsonValid] = useState(true);

    const handleJsonChange = (setter: React.Dispatch<React.SetStateAction<string>>, validator: React.Dispatch<React.SetStateAction<boolean>>) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setter(text);
        if (!text.trim()) {
            validator(true); 
            return;
        }
        try {
            JSON.parse(text);
            validator(true);
        } catch (error) {
            validator(false);
        }
    };
    
    return (
        <div className={cn("relative transition-opacity")}>
            {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
            <DialogHeader>
                <DialogTitle>{isEditMode ? t('adminDashboard.geocoding.editTitle') : t('adminDashboard.geocoding.newTitle')}</DialogTitle>
                <DialogDescription>{t('adminDashboard.geocoding.formDescription')}</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="id" value={service?.id || ''} />

            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t('adminDashboard.geocoding.nameLabel')}</Label>
                    <Input id="name" name="name" defaultValue={service?.name} placeholder="LocationIQ" required disabled={pending}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="request_config">{t('adminDashboard.geocoding.requestConfigLabel')}</Label>
                    <Textarea 
                        id="request_config"
                        name="request_config"
                        value={requestConfig}
                        onChange={handleJsonChange(setRequestConfig, setIsRequestJsonValid)}
                        placeholder='{ "api_config": { "base_url": "...", "parameters": { ... } } }' 
                        required 
                        disabled={pending}
                        className={cn("min-h-[150px] font-mono text-xs", !isRequestJsonValid && "border-destructive focus-visible:ring-destructive")}
                    />
                    {!isRequestJsonValid && <p className="text-sm text-destructive">{t('adminDashboard.geocoding.invalidJson')}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="response_config">{t('adminDashboard.geocoding.responseConfigLabel')}</Label>
                    <Textarea 
                        id="response_config"
                        name="response_config"
                        value={responseConfig}
                        onChange={handleJsonChange(setResponseConfig, setIsResponseJsonValid)}
                        placeholder='{\n  "lat": "...",\n  "lon": "..."\n}'
                        required 
                        disabled={pending}
                        className={cn("min-h-[100px] font-mono text-xs", !isResponseJsonValid && "border-destructive focus-visible:ring-destructive")}
                    />
                    {!isResponseJsonValid && <p className="text-sm text-destructive">{t('adminDashboard.geocoding.invalidJson')}</p>}
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={pending || !isRequestJsonValid || !isResponseJsonValid}>
                    {pending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? t('common.saveChanges') : t('common.create')}
                </Button>
            </DialogFooter>
        </div>
    )
}


function ServiceFormDialog({ isOpen, onOpenChange, service, onSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, service: GeocodingService | null, onSuccess: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!service;
    const formAction = isEditMode ? updateGeocodingService : createGeocodingService;
    
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
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form action={dispatch}>
                    <ServiceFormFields service={service} onCancel={() => onOpenChange(false)} />
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function ManageGeocodingDialog() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [services, setServices] = useState<GeocodingService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [editingService, setEditingService] = useState<GeocodingService | null>(null);
  
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
        const result = await getGeocodingServices();
        setServices(Array.isArray(result) ? result : []);
    } catch (e) {
        setServices([]);
        console.error("Failed to fetch geocoding services", e);
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

  const handleEditClick = (service: GeocodingService) => {
      setEditingService(service);
      setIsFormOpen(true);
  };
  
    const handleCreateClick = () => {
        setEditingService(null);
        setIsFormOpen(true);
    };

  const handleDelete = (id: string) => {
    startSubmitting(async () => {
       const result = await deleteGeocodingService(id);
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
        const result = await setGeocodingServiceAsDefault(id);
        if(result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            fetchServices();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
    });
  }

  const handleTest = (id: string) => {
      setTestingId(id);
      startSubmitting(async () => {
          const result = await testGeocodingService(id);
          if (result.success) {
              toast({ title: t('toast.successTitle'), description: result.message, duration: 9000 });
          } else {
              toast({ 
                title: t('toast.errorTitle'), 
                description: result.message, 
                variant: 'destructive',
                copyable: true,
                duration: 15000 
              });
          }
          setTestingId(null);
      });
  }

  return (
    <>
      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <MapPin className="mr-2 h-4 w-4" />
                <span>{t('adminDashboard.geocoding.title')}</span>
            </DropdownMenuItem>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
            <div className={cn("relative")}>
                {(isSubmitting && !testingId) && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.geocoding.title')}</DialogTitle>
                    <DialogDescription>
                        {t('adminDashboard.geocoding.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <TooltipProvider>
                    {isLoading ? (
                        Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : services.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">{t('adminDashboard.geocoding.noServices')}</p>
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
                                        <p>{t('adminDashboard.geocoding.setAsDefault')}</p>
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
                                        <p>{t('adminDashboard.geocoding.test')}</p>
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
                                                <AlertDialogDescription>{t('adminDashboard.geocoding.deleteConfirmation', { name: service.name })}</AlertDialogDescription>
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
                        <PlusCircle className="mr-2 h-4 w-4"/>{t('adminDashboard.geocoding.addButton')}
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
