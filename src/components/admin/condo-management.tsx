
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
  MapPin,
  CheckCircle,
  AlertCircle,
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { createCondominio, getCondominios, updateCondominio, deleteCondominio, type Condominio } from '@/actions/condos';
import { geocodeAddress, type GeocodeResult } from '@/actions/geocoding';

type LocationData = {
    name: string;
    continent: string;
    country: string;
    state: string;
    city: string;
    street: string;
    number: string;
    countries: { name: string }[];
    states: { name: string }[];
    cities: string[];
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
  const continents = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2 col-span-2">
        <Label htmlFor="continent-display">Continente</Label>
        <Select
          onValueChange={(value) => onLocationChange('continent', value)}
          value={locationData.continent}
          disabled={isFormDisabled}
        >
          <SelectTrigger id="continent-display">
            <SelectValue placeholder="Seleccionar continente" />
          </SelectTrigger>
          <SelectContent>
            {continents.map((continent) => (
              <SelectItem key={continent} value={continent}>
                {continent}
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
          disabled={!locationData.continent || isFormDisabled || !locationData.countries?.length}
        >
          <SelectTrigger id="country-display">
            <SelectValue placeholder={!locationData.continent ? "Seleccionar continente primero" : "Seleccionar país"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.countries?.map((country) => (
              <SelectItem key={country.name} value={country.name}>
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
  locationData,
  onSelectAddress,
  onClose,
  getCachedData,
}: {
  locationData: Partial<Pick<LocationData, 'street' | 'city' | 'state' | 'country'>>;
  onSelectAddress: (address: Pick<GeocodeResult, 'route' | 'street_number'>) => void;
  onClose: () => void;
  getCachedData: (key: string, fetcher: () => Promise<any>) => Promise<any>;
}) {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!locationData.street || !locationData.city || !locationData.state || !locationData.country) {
        setError(t('addressVerification.error.missingInfo'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      const { street, city, state, country } = locationData;
      const cacheKey = `geocode_${country}_${state}_${city}_${street}`;
      
      try {
        const response = await getCachedData(cacheKey, () => geocodeAddress({
            street: street!,
            city: city!,
            state: state!,
            country: country!,
        }));

        if (response.success && response.data) {
            setResults(response.data);
        } else if (!response.success) {
            setError(response.message);
        }
      } catch (err: any) {
         setError(err.message || "An unexpected error occurred.");
      }
      setIsLoading(false);
    }
    verify();
  }, [locationData, t, getCachedData]);

  const handleSelect = (result: GeocodeResult) => {
    onSelectAddress({
      route: result.route,
      street_number: result.street_number,
    });
    onClose();
  };
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('addressVerification.title')}</DialogTitle>
        <DialogDescription>
          {t('addressVerification.description')}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader className="h-5 w-5 animate-spin" />
            <span>{t('addressVerification.loading')}</span>
          </div>
        ) : error ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelect(result)}
                className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors flex items-start gap-4"
              >
                <MapPin className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                <div className="flex-grow">
                    <p className="font-semibold">{result.route}{result.street_number ? `, ${result.street_number}` : ''}</p>
                    <p className="text-sm text-muted-foreground">{result.formatted_address}</p>
                </div>
                <div className="ml-auto pl-2">
                    <CheckCircle className="h-5 w-5 text-green-500"/>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('addressVerification.notFound')}</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CondoFormFields({
  isEditMode,
  initialData,
  isFormPending,
  locationData,
  onLocationChange,
  onVerifyAddress,
}: {
  isEditMode: boolean,
  initialData: Partial<Condominio>,
  isFormPending: boolean,
  locationData: Partial<LocationData>;
  onLocationChange: (field: keyof Omit<LocationData, 'countries' | 'states' | 'cities' | 'name' | 'street' | 'number'>, value: string) => void;
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
            <input type="hidden" name="continent" value={locationData.continent || ''} />
            <input type="hidden" name="country" value={locationData.country || ''} />
            <input type="hidden" name="state" value={locationData.state || ''} />
            <input type="hidden" name="city" value={locationData.city || ''} />
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
                <div className="flex items-center gap-2">
                    <Input
                        id="street"
                        name="street"
                        defaultValue={initialData.street}
                        placeholder="Ex: Rua das Flores"
                        required
                        disabled={isFormPending}
                    />
                     <Button type="button" variant="outline" size="sm" onClick={onVerifyAddress} disabled={isFormPending || !locationData.city}>
                        {t('addressVerification.checkButton')}
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
                  defaultValue={initialData.number}
                  placeholder="Ex: 123"
                  required
                  disabled={isFormPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click()} disabled={isFormPending}>
              {t('adminDashboard.newCondoDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isFormPending}>
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
  getCachedData,
}: {
  closeDialog: () => void;
  formAction: (prevState: any, formData: FormData) => Promise<any>;
  initialData: Partial<LocationData> & Partial<Condominio>;
  isEditMode: boolean;
  getCachedData: (key: string, fetcher: () => Promise<any>) => Promise<any>;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const handleAction = async (prevState: any, formData: FormData) => {
    const result = await formAction(prevState, formData);
    if (result?.success === false) {
      toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
    }
    if (result?.success === true) {
      toast({ title: t('toast.successTitle'), description: result.message });
      closeDialog();
    }
    return result;
  };
  
  const [state, dispatchFormAction, isFormPending] = useActionState(handleAction, undefined);
  
  const [locationData, setLocationData] = useState<Partial<LocationData>>(initialData);
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);

  const fetchCountries = useCallback((continent: string) => getCachedData(`countries_${continent}`, async () => {
    try {
        const res = await fetch(`https://restcountries.com/v3.1/region/${continent}?fields=name`);
        const data = await res.json();
        return (data || []).map((c: any) => ({ name: c.name.common })).sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (e) { return []; }
  }), [getCachedData]);

  const fetchStates = useCallback((country: string) => getCachedData(`states_${country}`, async () => {
    try {
        const res = await fetch(`https://countriesnow.space/api/v0.1/countries/states`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country })
        });
        const data = await res.json();
        if (data.error) return [];
        return (data.data?.states || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (e) { return []; }
  }), [getCachedData]);

  const fetchCities = useCallback((country: string, state: string) => getCachedData(`cities_${country}_${state}`, async () => {
    try {
        const res = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, state })
        });
        const data = await res.json();
        if (data.error) return [];
        return (Array.isArray(data.data) ? data.data : []).sort();
    } catch (e) { return []; }
  }), [getCachedData]);
  
  const [isLocationLoading, startLocationTransition] = useTransition();

  const handleLocationChange = useCallback((field: keyof Omit<LocationData, 'countries' | 'states' | 'cities' | 'name' | 'street' | 'number'>, value: string) => {
    let resetFields: Partial<LocationData> = {};
    if (field === 'continent') {
        resetFields = { country: '', state: '', city: '', countries: [], states: [], cities: [] };
    } else if (field === 'country') {
        resetFields = { state: '', city: '', states: [], cities: [] };
    } else if (field === 'state') {
        resetFields = { city: '', cities: [] };
    }

    setLocationData(currentData => ({ ...currentData, [field]: value, ...resetFields }));
  }, []);
  
  useEffect(() => {
    if (locationData.continent && !locationData.countries?.length) {
        startLocationTransition(async () => {
            const countries = await fetchCountries(locationData.continent!);
            setLocationData(current => ({ ...current, countries }));
        });
    }
  }, [locationData.continent, locationData.countries, fetchCountries]);

  useEffect(() => {
      if (locationData.country && !locationData.states?.length) {
          startLocationTransition(async () => {
              const states = await fetchStates(locationData.country!);
              setLocationData(current => ({...current, states}));
          });
      }
  }, [locationData.country, locationData.states, fetchStates]);

  useEffect(() => {
      if (locationData.country && locationData.state && !locationData.cities?.length) {
          startLocationTransition(async () => {
              const cities = await fetchCities(locationData.country!, locationData.state!);
              setLocationData(current => ({...current, cities}));
          });
      }
  }, [locationData.country, locationData.state, locationData.cities, fetchCities]);

  const handleSelectAddress = (address: Pick<GeocodeResult, 'route' | 'street_number'>) => {
      const streetInput = formRef.current?.elements.namedItem('street') as HTMLInputElement | null;
      const numberInput = formRef.current?.elements.namedItem('number') as HTMLInputElement | null;
      if (streetInput) streetInput.value = address.route || '';
      if (numberInput) numberInput.value = address.street_number || '';
  };

  const handleVerifyAddress = () => {
      const streetInput = formRef.current?.elements.namedItem('street') as HTMLInputElement | null;
      if (streetInput && streetInput.value && locationData.city && locationData.state && locationData.country) {
          const dataForVerification = {
            ...locationData,
            street: streetInput.value,
          };
          setLocationData(dataForVerification);
          setIsVerifyingAddress(true);
      }
  }
  
  const isFormDisabled = isFormPending || isLocationLoading;

  return (
    <>
        <div className={cn('relative transition-opacity', isFormDisabled && 'opacity-50')}>
            {isFormDisabled && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                        <Loader className="h-12 w-12 animate-spin" />
                        <span>
                            {isLocationLoading ? t('adminDashboard.loadingOverlay.loading') : (isEditMode ? t('adminDashboard.editCondoDialog.save') + '...' : t('adminDashboard.loadingOverlay.creating'))}
                        </span>
                    </div>
                </div>
            )}
            <form ref={formRef} action={dispatchFormAction}>
            <input type="hidden" name="id" value={initialData.id || ''} />
            <CondoFormFields
                isEditMode={isEditMode}
                initialData={initialData}
                isFormPending={isFormDisabled}
                locationData={locationData}
                onLocationChange={handleLocationChange}
                onVerifyAddress={handleVerifyAddress}
            />
            </form>
        </div>
        <Dialog open={isVerifyingAddress} onOpenChange={setIsVerifyingAddress}>
            <AddressVerificationDialog
                locationData={locationData}
                onSelectAddress={handleSelectAddress}
                onClose={() => setIsVerifyingAddress(false)}
                getCachedData={getCachedData}
            />
        </Dialog>
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

    // --- Caching helpers for location data ---
    const getCachedData = useCallback(async (key: string, fetcher: () => Promise<any>) => {
        if (typeof window === 'undefined') return fetcher();
        try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
                return JSON.parse(cached);
            }
            const data = await fetcher();
            if (data) {
                sessionStorage.setItem(key, JSON.stringify(data));
            }
            return data;
        } catch (error) {
            console.error(`Failed to get or set cached data for key "${key}":`, error);
            return fetcher();
        }
    }, []);

    const fetchCondos = useCallback(async () => {
        setLoading(true);
        const result = await getCondominios();
        if(result.success && result.data) {
            setCondominios(result.data);
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        setLoading(false);
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
        setIsPreparingEdit(true);

        const fetchCountries = (continent: string) => getCachedData(`countries_${continent}`, () => 
            fetch(`https://restcountries.com/v3.1/region/${continent}?fields=name`).then(res => res.json())
            .then(data => (data || []).map((c: any) => ({ name: c.name.common })).sort((a: any, b: any) => a.name.localeCompare(b.name)))
            .catch(() => [])
        );

        const fetchStates = (country: string) => getCachedData(`states_${country}`, () => 
            fetch(`https://countriesnow.space/api/v0.1/countries/states`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country }) }).then(res => res.json())
            .then(data => data.error ? [] : (data.data?.states || []).sort((a: any, b: any) => a.name.localeCompare(b.name)))
            .catch(() => [])
        );

        const fetchCities = (country: string, state: string) => getCachedData(`cities_${country}_${state}`, () =>
            fetch(`https://countriesnow.space/api/v0.1/countries/state/cities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, state }) }).then(res => res.json())
            .then(data => data.error ? [] : (Array.isArray(data.data) ? data.data : []).sort())
            .catch(() => [])
        );
    
        try {
            if (!condo.continent || !condo.country || !condo.state) {
                toast({ title: t('toast.errorTitle'), description: "Condominio con datos de ubicación incompletos.", variant: 'destructive' });
                setIsPreparingEdit(false);
                return;
            }

            const [countries, states, cities] = await Promise.all([
                fetchCountries(condo.continent),
                fetchStates(condo.country),
                fetchCities(condo.country, condo.state)
            ]);
        
            setEditingCondoData({
                ...condo,
                countries,
                states,
                cities,
            });

            setIsEditCondoDialogOpen(true);
        } catch (error: any) {
            toast({ title: t('toast.errorTitle'), description: error.message || t('toast.preloadError'), variant: 'destructive' });
        } finally {
            setIsPreparingEdit(false);
        }
    }, [toast, t, getCachedData]);
  
    const handleDeleteCondo = async (condoId: string) => {
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
            });
        }
    }
  
    const handleCondoFormSuccess = () => {
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
                        <span>{t('adminDashboard.loadingOverlay.preparingEdit')}</span>
                    </div>
                </div>
            )}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
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
                            closeDialog={handleCondoFormSuccess}
                            formAction={createCondominio}
                            isEditMode={false}
                            initialData={{}}
                            getCachedData={getCachedData}
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
                                <Button aria-haspopup="true" size="icon" variant="ghost">
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
                                            <Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}
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
            
            {/* Edit Condo Dialog */}
            <Dialog open={isEditCondoDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                setEditingCondoData(null);
                }
                setIsEditCondoDialogOpen(isOpen);
            }}>
                <DialogContent>
                    {editingCondoData && (
                        <CondoFormWrapper
                            closeDialog={handleCondoFormSuccess}
                            formAction={handleUpdateCondoAction}
                            initialData={editingCondoData}
                            isEditMode={true}
                            getCachedData={getCachedData}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
