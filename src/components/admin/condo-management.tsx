
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
    name: string;
    region: string;
    country: string;
    state: string;
    city: string;
    street: string;
    number: string;
    regions: string[];
    countries: AddressDataItem[];
    states: AddressDataItem[];
    cities: string[];
    latitude?: number | null;
    longitude?: number | null;
};

const LocationSelector = ({
  locationData,
  onLocationChange,
  isFormDisabled,
}: {
  locationData: Partial<LocationData>;
  onLocationChange: (field: keyof Omit<LocationData, 'countries' | 'states' | 'cities' | 'name' | 'street' | 'number'>, value: string) => void;
  isFormDisabled?: boolean;
}) => {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2 col-span-2">
        <Label htmlFor="region-display">Región</Label>
        <Select
          onValueChange={(value) => onLocationChange('region', value)}
          value={locationData.region}
          disabled={isFormDisabled || !locationData.regions?.length}
        >
          <SelectTrigger id="region-display">
            <SelectValue placeholder="Seleccionar región" />
          </SelectTrigger>
          <SelectContent>
            {locationData.regions?.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="country-display">{t('adminDashboard.newCondoDialog.countryLabel')}</Label>
        <Select
          onValueChange={(value) => onLocationChange('country', value)}
          value={locationData.country}
          disabled={!locationData.region || isFormDisabled || !locationData.countries?.length}
        >
          <SelectTrigger id="country-display">
            <SelectValue placeholder={!locationData.region ? "Seleccionar región primero" : "Seleccionar país"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.countries?.map((country) => (
              <SelectItem key={country.name} value={country.name}>
                <span className="mr-2">{country.flag}</span>
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
          value={locationData.state}
          disabled={!locationData.country || isFormDisabled || !locationData.states?.length}
        >
          <SelectTrigger id="state-display">
            <SelectValue placeholder={!locationData.country ? "Seleccionar país primero" : "Seleccionar estado"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.states?.map((state) => (
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
          value={locationData.city}
          disabled={!locationData.state || isFormDisabled || !locationData.cities?.length}
        >
          <SelectTrigger id="city-display">
            <SelectValue placeholder={!locationData.state ? "Seleccionar estado primero" : "Seleccionar ciudad"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.cities?.map((city) => (
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
  locationData,
  onLocationChange,
  onStreetChange,
  onNumberChange,
  onVerifyAddress,
}: {
  isEditMode: boolean,
  initialData: Partial<Condominio>,
  isFormPending: boolean,
  locationData: Partial<LocationData>;
  onLocationChange: (field: keyof Omit<LocationData, 'countries' | 'states' | 'cities' | 'name' | 'street' | 'number'>, value: string) => void;
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
            <input type="hidden" name="region" value={locationData.region || ''} />
            <input type="hidden" name="country" value={locationData.country || ''} />
            <input type="hidden" name="state" value={locationData.state || ''} />
            <input type="hidden" name="city" value={locationData.city || ''} />
            <input type="hidden" name="latitude" value={locationData.latitude || ''} />
            <input type="hidden" name="longitude" value={locationData.longitude || ''} />
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
              locationData={locationData}
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
                        value={locationData.street || ''}
                        onChange={(e) => onStreetChange(e.target.value)}
                        placeholder="Ex: Rua das Flores"
                        required
                        disabled={isFormPending}
                        autoComplete="off"
                    />
                    <Button type="button" variant="outline" onClick={onVerifyAddress} disabled={isFormPending || !locationData.street}>
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
                  value={locationData.number || ''}
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
  initialData: Partial<LocationData> & Partial<Condominio>;
  isEditMode: boolean;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  
  const [locationData, setLocationData] = useState<Partial<LocationData>>(initialData);
  const [isLocationLoading, startLocationTransition] = useTransition();
  const isInitialLoad = useRef(true);

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

  const handleLocationChange = useCallback((field: keyof Pick<LocationData, 'region' | 'country' | 'state' | 'city'>, value: string) => {
    startLocationTransition(async () => {
        if (field === 'region') {
            const countriesData = await fetchAddressData({ region: value });
            setLocationData(current => ({...current, region: value, country: '', state: '', city: '', countries: countriesData.data?.countries || [], states: [], cities: [] }));
        } else if (field === 'country') {
            const statesData = await fetchAddressData({ country: value });
            setLocationData(current => ({...current, country: value, state: '', city: '', states: statesData.data?.states || [], cities: [] }));
        } else if (field === 'state') {
            const citiesData = await fetchAddressData({ country: locationData.country, state: value });
            setLocationData(current => ({...current, state: value, city: '', cities: citiesData.data?.cities || [] }));
        } else {
             setLocationData(current => ({ ...current, [field]: value }));
        }
    });
  }, [locationData.country]);
  
  const handleStreetChange = (value: string) => {
      setLocationData(current => ({ ...current, street: value }));
  }
   const handleNumberChange = (value: string) => {
      setLocationData(current => ({ ...current, number: value }));
  }

  const handleVerifyAddress = () => {
    if (!locationData.street) return;
    setIsVerificationDialogOpen(true);
    startVerificationTransition(async () => {
        const countryData = locationData.countries?.find(c => c.name === locationData.country);
        const result = await autocompleteAddress({
            address: locationData.street!,
            city: locationData.city,
            state: locationData.state,
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
      
      setLocationData(current => ({
          ...current,
          street: street,
          latitude: suggestion.lat,
          longitude: suggestion.lon,
      }));
      setIsVerificationDialogOpen(false);
  }

  const isFormDisabled = isFormPending || isLocationLoading;

  useEffect(() => {
    startLocationTransition(async () => {
        const regionsData = await fetchAddressData({});
        setLocationData(current => ({ ...current, regions: regionsData.data?.regions || [] }));
    });
  }, []);
  
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
                locationData={locationData}
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
  
    const [editingCondoData, setEditingCondoData] = useState<Condominio & Partial<LocationData> | null>(null);
    const [isPreparingEdit, setIsPreparingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, startDeletingTransition] = useTransition();

    const [locationCache, setLocationCache] = useState<Record<string, AddressData>>({});

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
        const cacheKey = `${condo.region}-${condo.country}-${condo.state}`;
        const hasCache = !!locationCache[cacheKey];

        if (!hasCache) {
            setIsPreparingEdit(true);
        }

        try {
            const regionsData = await fetchAddressData({});
            const countriesData = await fetchAddressData({ region: condo.region });
            const statesData = await fetchAddressData({ country: condo.country });
            const citiesData = await fetchAddressData({ country: condo.country, state: condo.state });

            const fullLocationData: AddressData = {
                regions: regionsData.data?.regions || [],
                countries: countriesData.data?.countries || [],
                states: statesData.data?.states || [],
                cities: citiesData.data?.cities || [],
            };
            
            setLocationCache(prev => ({...prev, [cacheKey]: fullLocationData}));

            setEditingCondoData({
                ...condo,
                ...fullLocationData
            });

        } catch (error: any) {
            toast({ title: t('toast.errorTitle'), description: error.message || t('toast.preloadError'), variant: 'destructive', copyable: true });
        } finally {
            if (!hasCache) {
                setIsPreparingEdit(false);
            }
            setIsEditCondoDialogOpen(true);
        }
    }, [toast, t, locationCache]);
  
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
