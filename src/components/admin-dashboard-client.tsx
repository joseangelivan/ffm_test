

"use client";

import React, { useState, useEffect, useActionState, useRef, useTransition, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Building,
  PlusCircle,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Smartphone,
  Shield,
  UserPlus,
  Eye,
  LogOut,
  Settings,
  User,
  Languages,
  Moon,
  Sun,
  Loader,
  KeyRound,
  AlertCircle,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { handleLogoutAction, getSettings, updateSettings, createAdmin } from '@/actions/auth';
import { createCondominio, getCondominios, updateCondominio, deleteCondominio, type Condominio } from '@/actions/condos';
import { geocodeAddress, type GeocodeResult } from '@/actions/geocoding';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


type Session = {
    id: string;
    email: string;
    name: string;
    canCreateAdmins: boolean;
    type: 'admin' | 'resident' | 'gatekeeper';
}

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


function LogoutDialogContent() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
         <div className={cn("relative", pending && "opacity-50")}>
            {pending && (
                 <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                        <Loader className="h-12 w-12 animate-spin" />
                        <span>{t('login.loggingOut')}</span>
                    </div>
                </div>
            )}
            <AlertDialogHeader>
                <AlertDialogTitle>{t('dashboard.logoutConfirmation.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('dashboard.logoutConfirmation.description')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center pt-4">
                <AlertDialogCancel disabled={pending}>{t('dashboard.logoutConfirmation.cancel')}</AlertDialogCancel>
                <Button type="submit" disabled={pending} className="w-40 bg-destructive hover:bg-destructive/90">
                    {t('dashboard.logoutConfirmation.confirm')}
                </Button>
            </AlertDialogFooter>
        </div>
    )
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? pendingLabel : label}
        </Button>
    )
}

function LoadingOverlay({ text }: { text: string }) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{text}</span>
            </div>
        </div>
    );
}

function ManageAdminsForm({closeDialog}: {closeDialog: () => void}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [state, formAction] = useActionState(createAdmin, undefined);
    
    useEffect(() => {
        if (state?.success === false) {
            toast({
                title: t('toast.errorTitle'),
                description: state.message,
                variant: 'destructive'
            });
        }
        if (state?.success === true) {
            toast({
                title: t('toast.successTitle'),
                description: state.message
            });
            closeDialog();
        }
    }, [state, t, toast, closeDialog]);

    return (
        <form action={formAction}>
            <FormFields />
        </form>
    )
}

function FormFields() {
    const { t } = useLocale();
    const { pending } = useFormStatus();

    return (
         <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={t('adminDashboard.loadingOverlay.creating')} />}
            <DialogHeader>
                <DialogTitle>{t('adminDashboard.manageAdmins.title')}</DialogTitle>
                <DialogDescription>{t('adminDashboard.manageAdmins.description')}</DialogDescription>
            </DialogHeader>
             <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t('adminDashboard.manageAdmins.nameLabel')}</Label>
                    <Input id="name" name="name" placeholder="John Doe" required disabled={pending}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('adminDashboard.manageAdmins.emailLabel')}</Label>
                    <Input id="email" name="email" type="email" placeholder="admin@example.com" required autoComplete="email" disabled={pending}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">{t('adminDashboard.manageAdmins.passwordLabel')}</Label>
                    <Input id="password" name="password" type="password" required autoComplete="new-password" disabled={pending}/>
                </div>
                <div className="flex items-center space-x-2">
                   <Checkbox id="can_create_admins" name="can_create_admins" disabled={pending}/>
                   <Label htmlFor="can_create_admins" className="text-sm font-normal">
                        {t('adminDashboard.manageAdmins.canCreateAdminsLabel')}
                    </Label>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" disabled={pending}>{t('adminDashboard.newCondoDialog.cancel')}</Button>
                </DialogClose>
                <Button type="submit" disabled={pending}>
                    {t('adminDashboard.manageAdmins.createButton')}
                </Button>
            </DialogFooter>
        </div>
    )
}

function ManageAdminsDialog() {
    const { t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.manageAdmins.title')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <ManageAdminsForm closeDialog={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

// Caching helpers are now passed down, so they must be defined in the parent component.
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
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={isFormPending}>
                {t('adminDashboard.newCondoDialog.cancel')}
              </Button>
            </DialogClose>
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
  fetchCountries,
  fetchStates,
  fetchCities,
  setIsParentLoading,
}: {
  closeDialog: () => void;
  formAction: (prevState: any, formData: FormData) => Promise<any>;
  initialData: Partial<Condominio>;
  isEditMode: boolean;
  getCachedData: (key: string, fetcher: () => Promise<any>) => Promise<any>;
  fetchCountries: (continent: string) => Promise<{ name: string }[]>;
  fetchStates: (country: string) => Promise<{ name: string }[]>;
  fetchCities: (country: string, state: string) => Promise<string[]>;
  setIsParentLoading: (isLoading: boolean) => void;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatchFormAction, isFormPending] = useActionState(formAction, undefined);
  
  const [locationData, setLocationData] = useState<Partial<LocationData>>({});
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  const [isLocationLoading, startTransition] = useTransition();

  // Effect to load data for editing
  useEffect(() => {
    if (!isEditMode) return;
    
    async function loadEditData() {
        if (!initialData.continent) return;
        setIsParentLoading(true);
        startTransition(async () => {
            const countries = await fetchCountries(initialData.continent!);
            setLocationData({ ...initialData, countries });
        });
    }
    loadEditData();
  }, [isEditMode, initialData, fetchCountries, setIsParentLoading]);

  useEffect(() => {
    if (!isEditMode || !locationData.countries || !initialData.country) return;
     startTransition(async () => {
        const states = await fetchStates(initialData.country!);
        setLocationData(current => ({ ...current, states }));
     });
  }, [isEditMode, locationData.countries, initialData.country, fetchStates]);

  useEffect(() => {
    if (!isEditMode || !locationData.states || !initialData.state || !initialData.country) return;
    startTransition(async () => {
        const cities = await fetchCities(initialData.country!, initialData.state!);
        setLocationData(current => ({...current, cities}));
        setIsParentLoading(false);
    });
  }, [isEditMode, locationData.states, initialData.state, initialData.country, fetchCities, setIsParentLoading]);


  const handleLocationChange = useCallback((field: keyof Omit<LocationData, 'countries' | 'states' | 'cities' | 'name' | 'street' | 'number'>, value: string) => {
    startTransition(async () => {
        let fieldsToUpdate: Partial<LocationData> = { [field]: value };

        if (field === 'continent') {
            fieldsToUpdate = { ...fieldsToUpdate, country: '', state: '', city: '', states: [], cities: [] };
            const countries = await fetchCountries(value);
            fieldsToUpdate.countries = countries;
        } else if (field === 'country') {
            fieldsToUpdate = { ...fieldsToUpdate, state: '', city: '', cities: [] };
            const states = await fetchStates(value);
            fieldsToUpdate.states = states;
        } else if (field === 'state' && locationData.country) {
            fieldsToUpdate = { ...fieldsToUpdate, city: '' };
            const cities = await fetchCities(locationData.country, value);
            fieldsToUpdate.cities = cities;
        }
        
        setLocationData(currentData => ({
            ...currentData,
            ...fieldsToUpdate,
        }));
    });
  }, [locationData.country, fetchCountries, fetchStates, fetchCities]);

  useEffect(() => {
    if (state?.success === false) {
      toast({
        title: t('toast.errorTitle'),
        description: state.message,
        variant: 'destructive',
      });
    }
    if (state?.success === true) {
      toast({
        title: t('toast.successTitle'),
        description: state.message,
      });
      closeDialog();
    }
  }, [state, t, toast, closeDialog]);

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


export default function AdminDashboardClient({ session }: { session: Session }) {
  const { t, setLocale, locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isNewCondoDialogOpen, setIsNewCondoDialogOpen] = useState(false);
  const [isEditCondoDialogOpen, setIsEditCondoDialogOpen] = useState(false);
  
  const [editingCondoData, setEditingCondoData] = useState<Condominio | null>(null);
  const [isPreparingEdit, setIsPreparingEdit] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

  const fetchCountries = useCallback((continent: string) => getCachedData(`countries_${continent}`, async () => {
    try {
        const res = await fetch(`https://restcountries.com/v3.1/region/${continent}?fields=name`);
        const data = await res.json();
        return (data || []).map((c: any) => ({ name: c.name.common })).sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Failed to load countries", e);
        return [];
    }
  }), [getCachedData]);

  const fetchStates = useCallback((country: string) => getCachedData(`states_${country}`, async () => {
    try {
        const res = await fetch(`https://countriesnow.space/api/v0.1/countries/states`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country })
        });
        const data = await res.json();
        if (data.error) return [];
        return (data.data?.states || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Failed to load states", e);
        return [];
    }
  }), [getCachedData]);

  const fetchCities = useCallback((country: string, state: string) => getCachedData(`cities_${country}_${state}`, async () => {
    try {
        const res = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, state })
        });
        const data = await res.json();
        if (data.error) return [];
        return (Array.isArray(data.data) ? data.data : []).sort();
    } catch (e) {
        console.error("Failed to load cities", e);
        return [];
    }
  }), [getCachedData]);


  const fetchCondos = useCallback(async () => {
      setLoading(true);
      const result = await getCondominios();
      if(result.success && result.data) {
          setCondominios(result.data);
      } else {
          toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
      }
      setLoading(false);
  }, [t, toast]);

  useEffect(() => {
    fetchCondos();
  }, [fetchCondos]);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings();
      if (settings) {
          setTheme(settings.theme);
          setLocale(settings.language);
          document.documentElement.classList.toggle('dark', settings.theme === 'dark');
      }
    }
    loadSettings();
  }, [setLocale]);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    await updateSettings({ theme: newTheme });
  }

  const handleSetLocale = async (newLocale: 'es' | 'pt') => {
      setLocale(newLocale);
      await updateSettings({ language: newLocale });
  }
  
  const handleUpdateCondoAction = async (prevState: any, formData: FormData) => {
    if (!editingCondoData) return { success: false, message: "No condo selected for editing."};
    
    const result = await updateCondominio(prevState, formData);
    if (result.success) {
        fetchCondos();
    }
    return result;
  };

  const prepareAndOpenEditDialog = useCallback((condo: Condominio) => {
    if (!condo.continent || !condo.country || !condo.state) {
        toast({
            title: t('toast.errorTitle'),
            description: "Condominio con datos de ubicación incompletos.",
            variant: 'destructive',
        });
        return;
    }
    setEditingCondoData(condo);
    setIsEditCondoDialogOpen(true);
  }, [toast, t]);
  
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
  
  const navigateToCondo = (condoId: string) => {
    router.push(`/admin/condominio/${condoId}`);
  };

  const handleCondoFormSuccess = useCallback(() => {
      setIsNewCondoDialogOpen(false);
      setIsEditCondoDialogOpen(false);
      setEditingCondoData(null);
      fetchCondos();
  }, [fetchCondos]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 relative">
       {isPreparingEdit && <LoadingOverlay text={t('adminDashboard.loadingOverlay.preparingEdit')} />}
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-40">
        <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary"/>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">{t('adminDashboard.title')}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${session.name.charAt(0)}`} alt={session.name} data-ai-hint="avatar" />
                    <AvatarFallback>{session.name.charAt(0)}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session.email}</p>
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.settings')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                           <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                  <Languages className="mr-2 h-4 w-4" />
                                  <span>{t('dashboard.language')}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                      <DropdownMenuItem onClick={() => handleSetLocale('es')}>
                                      Español {locale === 'es' && <span className="ml-auto">✓</span>}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSetLocale('pt')}>
                                      Português {locale === 'pt' && <span className="ml-auto">✓</span>}
                                      </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                  <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                  <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                  <span>{t('dashboard.theme.title')}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                      <DropdownMenuItem onClick={() => handleSetTheme('light')}>
                                      {t('dashboard.theme.light')} {theme === 'light' && <span className="ml-auto">✓</span>}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSetTheme('dark')}>
                                      {t('dashboard.theme.dark')} {theme === 'dark' && <span className="ml-auto">✓</span>}
                                      </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                          </DropdownMenuSub>
                          {session.canCreateAdmins && <ManageAdminsDialog />}
                      </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t('dashboard.logout')}</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <form action={handleLogoutAction}>
                      <LogoutDialogContent />
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="grid gap-4">
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
                        fetchCountries={fetchCountries}
                        fetchStates={fetchStates}
                        fetchCities={fetchCities}
                        setIsParentLoading={() => {}}
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
                            <DropdownMenuItem onSelect={() => navigateToCondo(condo.id)}>
                                <Eye className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
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
        </div>
      </main>

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
                        fetchCountries={fetchCountries}
                        fetchStates={fetchStates}
                        fetchCities={fetchCities}
                        setIsParentLoading={setIsPreparingEdit}
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}

    