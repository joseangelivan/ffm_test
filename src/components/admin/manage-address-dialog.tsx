
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
    createAddressService,
    getAddressServices,
    updateAddressService,
    deleteAddressService,
    setAddressServiceAsDefault,
    testAddressService,
    type AddressService
} from '@/actions/address';
import { 
    Home,
    Star,
    Loader,
    Edit,
    Trash2,
    PlusCircle,
    TestTube2,
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

function ServiceFormDialog({ isOpen, onOpenChange, service, onSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, service: AddressService | null, onSuccess: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!service;
    const formAction = isEditMode ? updateAddressService : createAddressService;
    
    const onFormSuccessCallback = useCallback(() => {
        onSuccess();
    }, [onSuccess]);

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result?.success === false) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', copyable: true });
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
    
    const [config, setConfig] = useState(isEditMode ? getInitialJson(service?.config_json) : '');
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
                    <div className={cn("relative transition-opacity")}>
                        {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? t('adminDashboard.address.editTitle') : t('adminDashboard.address.newTitle')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.address.formDescription')}</DialogDescription>
                        </DialogHeader>
                        <input type="hidden" name="id" value={service?.id || ''} />

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminDashboard.address.nameLabel')}</Label>
                                <Input id="name" name="name" defaultValue={service?.name} placeholder="Default Address Provider" required disabled={pending}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="config">{t('adminDashboard.address.configLabel')}</Label>
                                <Textarea 
                                    id="config"
                                    name="config"
                                    value={config}
                                    onChange={handleJsonChange}
                                    placeholder='{ "request": { ... }, "response": { ... } }' 
                                    required 
                                    disabled={pending}
                                    className={cn("min-h-[250px] font-mono text-xs", !isJsonValid && "border-destructive focus-visible:ring-destructive")}
                                />
                                {!isJsonValid && <p className="text-sm text-destructive">{t('adminDashboard.address.invalidJson')}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={pending || !isJsonValid}>
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

export function ManageAddressDialog() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [services, setServices] = useState<AddressService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitting] = React.useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [editingService, setEditingService] = useState<AddressService | null>(null);
  
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
        const result = await getAddressServices();
        setServices(Array.isArray(result) ? result : []);
    } catch (e) {
        setServices([]);
        console.error("Failed to fetch address services", e);
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

  const handleEditClick = (service: AddressService) => {
      setEditingService(service);
      setIsFormOpen(true);
  };
  
    const handleCreateClick = () => {
        setEditingService(null);
        setIsFormOpen(true);
    };

  const handleDelete = (id: string) => {
    startSubmitting(async () => {
       const result = await deleteAddressService(id);
       if(result.success) {
           toast({ title: t('toast.successTitle'), description: result.message });
           fetchServices();
       } else {
           toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', copyable: true });
       }
    });
  }

  const handleSetDefault = (id: string) => {
    startSubmitting(async () => {
        const result = await setAddressServiceAsDefault(id);
        if(result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            fetchServices();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', copyable: true });
        }
    });
  }
  
  const handleTest = (id: string) => {
      setTestingId(id);
      startSubmitting(async () => {
          const result = await testAddressService(id);
          if (result.success) {
              toast({ title: t('toast.successTitle'), description: result.message, duration: 10000 });
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
                <Home className="mr-2 h-4 w-4" />
                <span>{t('adminDashboard.address.title')}</span>
            </DropdownMenuItem>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
            <div className={cn("relative")}>
                {(isSubmitting && !testingId) && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.address.title')}</DialogTitle>
                    <DialogDescription>
                        {t('adminDashboard.address.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <TooltipProvider>
                    {isLoading ? (
                        Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : services.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">{t('adminDashboard.address.noServices')}</p>
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
                                        <p>{t('adminDashboard.address.setAsDefault')}</p>
                                    </TooltipContent>
                                </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleTest(service.id)} disabled={isSubmitting}>
                                            {testingId === service.id ? <Loader className="h-4 w-4 animate-spin"/> : <TestTube2 className="h-4 w-4"/>}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Probar Servicio</p>
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
                                                <AlertDialogDescription>{t('adminDashboard.address.deleteConfirmation', { name: service.name })}</AlertDialogDescription>
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
                        <PlusCircle className="mr-2 h-4 w-4"/>{t('adminDashboard.address.addButton')}
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

  