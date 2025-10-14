
"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef, useActionState } from 'react';
import Link from 'next/link';
import {
  Building,
  PlusCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader,
  CheckCircle,
  Search,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { createCondominio, getCondominios, updateCondominio, deleteCondominio, type Condominio } from '@/actions/condos';
import { autocompleteAddress, type AutocompleteResult } from '@/actions/geocoding';
import { fetchAddressData, type AddressData, type AddressDataItem } from '@/actions/address';
import { ScrollArea } from '../ui/scroll-area';

type LocationData = {
    regions?: AddressDataItem[];
    countries?: AddressDataItem[];
    states?: AddressDataItem[];
    cities?: string[];
    regionCodeMap?: Record<string, string>;
};

const LocationSelector = ({
  locationSelection,
  availableData,
  onLocationChange,
  isFormDisabled,
}: {
  locationSelection: Partial<Pick<Condominio, 'region' | 'country' | 'state' | 'city'>>;
  availableData: LocationData;
  onLocationChange: (field: 'region' | 'country' | 'state' | 'city', value: string) => void;
  isFormDisabled?: boolean;
}) => {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2 col-span-2">
        <Label htmlFor="region-display">Región</Label>
        <Select
          onValueChange={(value) => onLocationChange('region', value)}
          value={locationSelection.region}
          disabled={isFormDisabled || !availableData.regions?.length}
        >
          <SelectTrigger id="region-display">
            <SelectValue placeholder="Seleccionar región" />
          </SelectTrigger>
          <SelectContent>
            {availableData.regions?.map((region) => (
              <SelectItem key={region.name} value={region.name}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="country-display">{t('adminDashboard.newCondoDialog.countryLabel')}</Label>
        <Select
          onValueChange={(value) => onLocationChange('country', value)}
          value={locationSelection.country}
          disabled={!locationSelection.region || isFormDisabled || !availableData.countries?.length}
        >
          <SelectTrigger id="country-display">
            <SelectValue placeholder={!locationSelection.region ? "Seleccionar región primero" : "Seleccionar país"} />
          </SelectTrigger>
          <SelectContent>
            {availableData.countries?.map((country) => (
              <SelectItem key={country.name} value={country.name}>
                 {country.flag && <span className="mr-2">{country.flag}</span>}
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="state-display">{t('adminDashboard.newCondoDialog.stateLabel')}</Label>
        <Select
          onValueChange={(value) => onLocationChange('state', value)}
          value={locationSelection.state}
          disabled={!locationSelection.country || isFormDisabled || !availableData.states?.length}
        >
          <SelectTrigger id="state-display">
            <SelectValue placeholder={!locationSelection.country ? "Seleccionar país primero" : "Seleccionar estado"} />
          </SelectTrigger>
          <SelectContent>
            {availableData.states?.map((state) => (
              <SelectItem key={state.name} value={state.name}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 col-span-2">
        <Label htmlFor="city-display">{t('adminDashboard.newCondoDialog.cityLabel')}</Label>
        <Select
          onValueChange={(value) => onLocationChange('city', value)}
          value={locationSelection.city}
          disabled={!locationSelection.state || isFormDisabled || !availableData.cities?.length}
        >
          <SelectTrigger id="city-display">
            <SelectValue placeholder={!locationSelection.state ? "Seleccionar estado primero" : "Seleccionar ciudad"} />
          </SelectTrigger>
          <SelectContent>
            {availableData.cities?.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

function AddressVerificationDialog({ 
    results, 
    isLoading, 
    onSelect,
    isOpen,
    onOpenChange,
}: { 
    results: AutocompleteResult[], 
    isLoading: boolean, 
    onSelect: (result: AutocompleteResult) => void,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
}) {
    const { t } = useLocale();

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('addressVerification.title')}</DialogTitle>
                    <DialogDescription>{t('addressVerification.description')}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                         <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Loader className="h-5 w-5 animate-spin" />
                            <span>{t('addressVerification.loading')}</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-muted-foreground">
                           {t('addressVerification.notFound')}
                        </div>
                    ) : (
                        <ScrollArea className="h-64 border rounded-md">
                            <div className="p-2 space-y-1">
                            {results.map((result, index) => (
                                <div key={index} className="p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => onSelect(result)}>
                                    <p className="font-semibold">{result.address.split(',')[0]}</p>
                                    <p className="text-sm text-muted-foreground">{result.address.split(',').slice(1).join(',')}</p>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CondoFormFields({
  isEditMode,
  initialData,
  isFormPending,
  locationSelection,
  availableData,
  onLocationChange,
  onStreetChange,
  onNumberChange,
  onVerifyAddress,
}: {
  isEditMode: boolean;
  initialData: Partial<Condominio>;
  isFormPending: boolean;
  locationSelection: Partial<Pick<Condominio, 'region' | 'country' | 'state' | 'city' | 'street' | 'number' | 'latitude' | 'longitude'>>;
  availableData: LocationData;
  onLocationChange: (field: 'region' | 'country' | 'state' | 'city', value: string) => void;
  onStreetChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  onVerifyAddress: () => void;
}) {
    const { t } = useLocale();
    
    return (
        <>
          <DialogHeader>
            <DialogTitle>
              {isEditMode
                ? t('adminDashboard.editCondoDialog.title')
                : t('adminDashboard.newCondoDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? t('adminDashboard.editCondoDialog.description')
                : t('adminDashboard.newCondoDialog.description')}
            </DialogDescription>
          </DialogHeader>
           <div className="grid gap-4 py-4">
            <input type="hidden" name="region" value={locationSelection.region || ''} />
            <input type="hidden" name="country" value={locationSelection.country || ''} />
            <input type="hidden" name="state" value={locationSelection.state || ''} />
            <input type="hidden" name="city" value={locationSelection.city || ''} />
            <input type="hidden" name="latitude" value={locationSelection.latitude || ''} />
            <input type="hidden" name="longitude" value={locationSelection.longitude || ''} />
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t('adminDashboard.newCondoDialog.nameLabel')}
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name}
                placeholder="Ex: Residencial Jardins"
                required
                disabled={isFormPending}
              />
            </div>
            
            <LocationSelector
              locationSelection={locationSelection}
              availableData={availableData}
              onLocationChange={onLocationChange}
              isFormDisabled={isFormPending}
            />

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="street">
                  {t('adminDashboard.newCondoDialog.streetLabel')}
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="street"
                        name="street"
                        value={locationSelection.street || ''}
                        onChange={(e) => onStreetChange(e.target.value)}
                        placeholder="Ex: Rua das Flores"
                        required
                        disabled={isFormPending}
                        autoComplete="off"
                    />
                    <Button type="button" variant="outline" onClick={onVerifyAddress} disabled={isFormPending || !locationSelection.street}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="number">
                  {t('adminDashboard.newCondoDialog.numberLabel')}
                </Label>
                <Input
                  id="number"
                  name="number"
                  value={locationSelection.number || ''}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="Ex: 123"
                  required
                  disabled={isFormPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isFormPending}>
                    {t('adminDashboard.newCondoDialog.cancel')}
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isFormPending}>
              {isFormPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode
                ? t('adminDashboard.editCondoDialog.save')
                : t('adminDashboard.newCondoDialog.create')}
            </Button>
          </DialogFooter>
        </>
    )
}

function CondoFormWrapper({
  closeDialog,
  formAction,
  initialData,
  isEditMode,
}: {
  closeDialog: () => void;
  formAction: (prevState: any, formData: FormData) => Promise<any>;
  initialData: Partial<Condominio>;
  isEditMode: boolean;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  
  const [locationSelection, setLocationSelection] = useState({
      region: initialData.region || '',
      country: initialData.country || '',
      state: initialData.state || '',
      city: initialData.city || '',
      street: initialData.street || '',
      number: initialData.number || '',
      latitude: initialData.latitude,
      longitude: initialData.longitude
  });
  
  const [availableData, setAvailableData] = useState<LocationData>({
      regions: [],
      countries: [],
      states: [],
      cities: [],
      regionCodeMap: {}
  });

  const [isLocationLoading, startLocationTransition] = useTransition();

  const [verificationResults, setVerificationResults] = useState<AutocompleteResult[]>([]);
  const [isVerificationLoading, startVerificationTransition] = useTransition();
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  
  const handleAction = async (prevState: any, formData: FormData) => {
    const result = await formAction(prevState, formData);
    if (result?.success === false) {
      toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', copyable: true });
    }
    if (result?.success === true) {
      toast({ title: t('toast.successTitle'), description: result.message });
      closeDialog();
    }
    return result;
  };
  
  const [state, dispatchFormAction, isFormPending] = useActionState(handleAction, undefined);

  const handleLocationChange = useCallback((field: 'region' | 'country' | 'state' | 'city', value: string) => {
    startLocationTransition(async () => {
        let result: { success: boolean; data?: AddressData; message?: string; };

        try {
            if (field === 'region') {
                const regionCode = availableData.regionCodeMap?.[value];
                result = await fetchAddressData({ region: value, region_code: regionCode });
                
                const countryNames = result.data?.countries?.map(c => c.name) || [];
                toast({
                      title: 'DEBUG: Nombres de Países',
                      description: JSON.stringify(countryNames),
                      duration: 15000,
                      copyable: true,
                });
                
                // Stop flow here for debug
                return;
            }
        } catch (error: any) {
            toast({ title: t('toast.errorTitle'), description: error.message || "An unknown error occurred.", variant: 'destructive', copyable: true });
        }
    });
}, [availableData.regionCodeMap, toast, t]);
  
  const handleStreetChange = (value: string) => {
      setLocationSelection(current => ({ ...current, street: value }));
  }
   const handleNumberChange = (value: string) => {
      setLocationSelection(current => ({ ...current, number: value }));
  }

  const handleVerifyAddress = () => {
    if (!locationSelection.street) return;
    setIsVerificationDialogOpen(true);
    startVerificationTransition(async () => {
        const countryData = availableData.countries?.find(c => c.name === locationSelection.country);
        const result = await autocompleteAddress({
            address: locationSelection.street!,
            city: locationSelection.city,
            state: locationSelection.state,
            country_cca2: countryData?.cca2,
        });
        if (result.success) {
            setVerificationResults(result.data || []);
        } else {
            setVerificationResults([]);
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', copyable: true });
        }
    });
  }

  const handleAddressSelect = (suggestion: AutocompleteResult) => {
      const parts = suggestion.address.split(',');
      const street = parts[0] || '';
      
      setLocationSelection(current => ({
          ...current,
          street: street,
          latitude: suggestion.lat,
          longitude: suggestion.lon,
      }));
      setIsVerificationDialogOpen(false);
  }

  useEffect(() => {
    startLocationTransition(async () => {
      try {
        const result = await fetchAddressData({});
        if (result.success && result.data) {
            
            const initialAvailableData: LocationData = {
                regions: result.data.regions || [],
                countries: [],
                states: [],
                cities: [],
                regionCodeMap: result.data.regionCodeMap || {}
            };

            if (isEditMode && initialData.region) {
                const regionCode = result.data.regionCodeMap?.[initialData.region];
                const countriesResult = await fetchAddressData({ region: initialData.region, region_code: regionCode });
                initialAvailableData.countries = countriesResult.data?.countries || [];

                if(initialData.country) {
                    const statesResult = await fetchAddressData({ country: initialData.country });
                    initialAvailableData.states = statesResult.data?.states || [];
                }
                if(initialData.country && initialData.state) {
                    const citiesResult = await fetchAddressData({ country: initialData.country, state: initialData.state });
                    initialAvailableData.cities = citiesResult.data?.cities || [];
                }
            }
            setAvailableData(initialAvailableData);
        } else {
            throw new Error(result.message || "Failed to fetch initial address data.");
        }
      } catch (error: any) {
         toast({ title: t('toast.errorTitle'), description: error.message || "No se pudieron cargar los datos de ubicación inicial.", variant: 'destructive', copyable: true });
      }
    });
  }, [isEditMode, initialData.region, initialData.country, initialData.state, toast, t]);
  
  const isFormDisabled = isFormPending || isLocationLoading;

  return (
    <>
        <div className={cn('relative transition-opacity', isFormDisabled && 'opacity-50')}>
            {isFormDisabled && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                        <Loader className="h-12 w-12 animate-spin" />
                        <span>
                            {isLocationLoading ? t('adminDashboard.loadingOverlay.loading') : (isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating'))}
                        </span>
                    </div>
                </div>
            )}
            <form action={dispatchFormAction}>
            <input type="hidden" name="id" value={initialData.id || ''} />
            <CondoFormFields
                isEditMode={isEditMode}
                initialData={initialData}
                isFormPending={isFormDisabled}
                locationSelection={locationSelection}
                availableData={availableData}
                onLocationChange={handleLocationChange}
                onStreetChange={handleStreetChange}
                onNumberChange={handleNumberChange}
                onVerifyAddress={handleVerifyAddress}
            />
            </form>
        </div>
        <AddressVerificationDialog
            isOpen={isVerificationDialogOpen}
            onOpenChange={setIsVerificationDialogOpen}
            isLoading={isVerificationLoading}
            results={verificationResults}
            onSelect={handleAddressSelect}
        />
    </>
  );
}

export function CondoManagement() {
    const { t } = useLocale();
    const { toast } = useToast();
  
    const [condominios, setCondominios] = useState<Condominio[]>([]);
    const [loading, setLoading] = useState(true);
  
    const [isNewCondoDialogOpen, setIsNewCondoDialogOpen] = useState(false);
    const [isEditCondoDialogOpen, setIsEditCondoDialogOpen] = useState(false);
  
    const [editingCondoData, setEditingCondoData] = useState<Condominio | null>(null);
    const [isPreparingEdit, setIsPreparingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, startDeletingTransition] = useTransition();

    const fetchCondos = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getCondominios();
            if (result?.success && result.data) {
                setCondominios(result.data);
            } else if (result) {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', copyable: true });
            }
        } catch (error: any) {
             toast({ title: t('toast.errorTitle'), description: error.message || t('toast.adminLogin.serverError'), variant: 'destructive', copyable: true });
        } finally {
            setLoading(false);
        }
    }, [toast, t]);
  
    useEffect(() => {
        fetchCondos();
    }, [fetchCondos]);

    const handleUpdateCondoAction = async (prevState: any, formData: FormData) => {
        if (!editingCondoData) return { success: false, message: "No condo selected for editing."};
    
        const result = await updateCondominio(prevState, formData);
        if (result.success) {
            fetchCondos();
        }
        return result;
    };
  
    const prepareAndOpenEditDialog = useCallback(async (condo: Condominio) => {
        setEditingCondoData(condo);
        setIsEditCondoDialogOpen(true);
    }, []);
  
    const handleDeleteCondo = (condoId: string) => {
        setDeletingId(condoId);
        startDeletingTransition(async () => {
            const result = await deleteCondominio(condoId);
            if (result.success) {
                toast({
                    title: t('toast.successTitle'),
                    description: result.message,
                });
                fetchCondos();
            } else {
                toast({
                    title: t('toast.errorTitle'),
                    description: result.message,
                    variant: 'destructive',
                    copyable: true,
                });
            }
            setDeletingId(null);
        });
    }
  
    const onFormSuccess = () => {
        setIsNewCondoDialogOpen(false);
        setIsEditCondoDialogOpen(false);
        setEditingCondoData(null);
        fetchCondos();
    };

    return (
        <div className="grid gap-4 relative">
             {isPreparingEdit && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                        <Loader className="h-12 w-12 animate-spin" />
                        <span>
                            {t('adminDashboard.loadingOverlay.preparingEdit')}
                        </span>
                    </div>
                </div>
            )}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between p-4">
                <div>
                    <CardTitle>{t('adminDashboard.condoListTitle')}</CardTitle>
                    <CardDescription>{t('adminDashboard.condoListDescription')}</CardDescription>
                </div>
                <Dialog open={isNewCondoDialogOpen} onOpenChange={setIsNewCondoDialogOpen}>
                    <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-4 w-4" />
                        {t('adminDashboard.createCondoButton')}
                    </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <CondoFormWrapper
                            closeDialog={onFormSuccess}
                            formAction={createCondominio}
                            isEditMode={false}
                            initialData={{}}
                        />
                    </DialogContent>
                </Dialog>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('adminDashboard.table.condo')}</TableHead>
                        <TableHead>{t('adminDashboard.table.devices')}</TableHead>
                        <TableHead>{t('adminDashboard.table.residents')}</TableHead>
                        <TableHead>{t('adminDashboard.table.gatekeepers')}</TableHead>
                        <TableHead>
                        <span className="sr-only">{t('adminDashboard.table.actions')}</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell colSpan={5} className="p-4">
                                    <Skeleton className="h-10 w-full" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : condominios.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {t('adminDashboard.noCondos')}
                            </TableCell>
                        </TableRow>
                    ) : condominios.map((condo) => (
                        <TableRow key={condo.id} >
                        <TableCell>
                            <div className="font-medium">{condo.name}</div>
                            <div className="text-sm text-muted-foreground">{condo.address}</div>
                        </TableCell>
                        <TableCell>{condo.devices_count || 0}</TableCell>
                        <TableCell>{condo.residents_count || 0}</TableCell>
                        <TableCell>{condo.gatekeepers_count || 0}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isDeleting}>
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">{t('adminDashboard.table.toggleMenu')}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/condominio/${condo.id}`}>
                                        <Eye className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => prepareAndOpenEditDialog(condo)}>
                                    <Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                            {deletingId === condo.id ? <Loader className="h-4 w-4 mr-2 animate-spin"/> : <Trash2 className="h-4 w-4 mr-2"/>}
                                            {t('adminDashboard.table.delete')}
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('adminDashboard.deleteCondoDialog.title')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('adminDashboard.deleteCondoDialog.description', {name: condo.name})}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('adminDashboard.newCondoDialog.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCondo(condo.id)} className={buttonVariants({variant: 'destructive'})}>
                                                {isDeleting && deletingId === condo.id && <Loader className="mr-2 h-4 w-4 animate-spin"/>}
                                                {t('adminDashboard.table.delete')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
            
            <Dialog open={isEditCondoDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                setEditingCondoData(null);
                }
                setIsEditCondoDialogOpen(isOpen);
            }}>
                <DialogContent>
                    {editingCondoData && (
                        <CondoFormWrapper
                            closeDialog={onFormSuccess}
                            formAction={handleUpdateCondoAction}
                            initialData={editingCondoData}
                            isEditMode={true}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
