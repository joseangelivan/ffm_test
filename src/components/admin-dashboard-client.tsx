

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
    countries: string[];
    states: string[];
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
          disabled={!locationData.continent || isFormDisabled}
        >
          <SelectTrigger id="country-display">
            <SelectValue placeholder={!locationData.continent ? "Seleccionar continente primero" : "Seleccionar país"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.countries?.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
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
          disabled={!locationData.country || isFormDisabled}
        >
          <SelectTrigger id="state-display">
            <SelectValue placeholder={!locationData.country ? "Seleccionar país primero" : "Seleccionar estado"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.states?.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
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
          disabled={!locationData.state || isFormDisabled}
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
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
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

function AddressVerificationDialog({
  locationData,
  onSelectAddress,
  onClose,
}: {
  locationData: Partial<Pick<LocationData, 'street' | 'city' | 'state' | 'country'>>;
  onSelectAddress: (address: Pick<LocationData, 'street' | 'number'>) => void;
  onClose: () => void;
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
      const response = await geocodeAddress({
        street: locationData.street,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
      });

      if (response.success && response.data) {
        setResults(response.data);
      } else if (!response.success) {
        setError(response.message);
      }
      setIsLoading(false);
    }
    verify();
  }, [locationData, t]);

  const handleSelect = (result: GeocodeResult) => {
    onSelectAddress({
      street: result.route,
      number: result.street_number || '',
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
  initialData: Partial<LocationData>,
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
                        key={initialData.street} // Force re-render on select
                        placeholder="Ex: Rua das Flores"
                        required
                        disabled={isFormPending}
                    />
                     <Button type="button" variant="outline" size="sm" onClick={onVerifyAddress} disabled={isFormPending || !locationData.street}>
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
                  key={initialData.number} // Force re-render on select
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
}: {
  closeDialog: () => void;
  formAction: (prevState: any, formData: FormData) => Promise<any>;
  initialData: Partial<LocationData>;
  isEditMode: boolean;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatchFormAction, isPending] = useActionState(formAction, undefined);
  
  const [locationData, setLocationData] = useState<Partial<LocationData>>(initialData);
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  
  const handleLocationChange = useCallback(async (field: keyof Omit<LocationData, 'countries' | 'states' | 'cities' | 'name' | 'street' | 'number'>, value: string) => {
      setLocationData(currentData => {
        const newData = {...currentData, [field]: value};

        const updateStateAndFetch = async () => {
             if(field === 'continent') {
                newData.country = '';
                newData.state = '';
                newData.city = '';
                newData.states = [];
                newData.cities = [];
                try {
                    const res = await fetch(`https://restcountries.com/v3.1/region/${value}?fields=name`);
                    const data = await res.json();
                    newData.countries = (data || []).map((c: any) => c.name.common).sort();
                } catch(e) {
                    console.error("Failed to load countries", e);
                    newData.countries = [];
                }
            } else if (field === 'country') {
                newData.state = '';
                newData.city = '';
                newData.cities = [];
                try {
                    const res = await fetch(`https://countriesnow.space/api/v0.1/countries/states`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: value })
                    });
                    const data = await res.json();
                    newData.states = (data.data?.states || []).map((s: any) => s.name).sort();
                } catch(e) {
                    console.error("Failed to load states", e);
                    newData.states = [];
                }
            } else if (field === 'state') {
                newData.city = '';
                try {
                    const res = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: currentData.country, state: value })
                    });
                    const data = await res.json();
                    newData.cities = (Array.isArray(data.data) ? data.data : []).sort();
                } catch (e) {
                    console.error("Failed to load cities", e);
                    newData.cities = [];
                }
            }
            setLocationData(newData);
        }
        
        updateStateAndFetch();
        return newData;
      });
  }, []);
  
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

  const handleSelectAddress = (address: Pick<LocationData, 'street' | 'number'>) => {
    setLocationData(prev => ({...prev, street: address.street, number: address.number}));
  };

  const handleVerifyAddress = () => {
      const streetInput = formRef.current?.elements.namedItem('street') as HTMLInputElement | null;
      if (streetInput) {
          setLocationData(prev => ({...prev, street: streetInput.value}));
          setIsVerifyingAddress(true);
      }
  }

  return (
    <>
        <div className={cn('relative transition-opacity', isPending && 'opacity-50')}>
            {isPending && (
                <LoadingOverlay
                text={isEditMode ? t('adminDashboard.editCondoDialog.save') + '...' : t('adminDashboard.loadingOverlay.creating')}
                />
            )}
            <form ref={formRef} action={dispatchFormAction}>
            <input type="hidden" name="id" value={(initialData as any).id || ''} />
            <CondoFormFields
                isEditMode={isEditMode}
                initialData={initialData}
                isFormPending={isPending}
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
  
  const [editingCondoData, setEditingCondoData] = useState<Partial<LocationData> | null>(null);

  const [isPreparingEdit, setIsPreparingEdit] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
  
  const handleEditCondoAction = async (prevState: any, formData: FormData) => {
    if (!editingCondoData) return { success: false, message: "No condo selected for editing."};
    
    const result = await updateCondominio(prevState, formData);
    if (result.success) {
        fetchCondos();
    }
    return result;
  };

  const prepareAndOpenEditDialog = async (condo: Condominio) => {
      setIsPreparingEdit(true);

      const initialData: Partial<LocationData> & { id?: string } = {
          id: condo.id,
          name: condo.name,
          continent: condo.continent,
          country: condo.country,
          state: condo.state,
          city: condo.city,
          street: condo.street,
          number: condo.number,
          countries: [],
          states: [],
          cities: [],
      };

      try {
          if (initialData.continent) {
              const countryRes = await fetch(`https://restcountries.com/v3.1/region/${initialData.continent}?fields=name`);
              const countryData = await countryRes.json();
              initialData.countries = (countryData || []).map((c: any) => c.name.common).sort();

              if (initialData.country && initialData.countries.includes(initialData.country)) {
                  const stateRes = await fetch(`https://countriesnow.space/api/v0.1/countries/states`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: initialData.country })
                  });
                  const stateData = await stateRes.json();
                  initialData.states = (stateData.data?.states || []).map((s: any) => s.name).sort();

                  if (initialData.state && initialData.states.includes(initialData.state)) {
                      const cityRes = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: initialData.country, state: initialData.state })
                      });
                      const cityData = await cityRes.json();
                      initialData.cities = (Array.isArray(cityData.data) ? cityData.data : []).sort();
                  }
              }
          }
      } catch (error) {
          console.error("Failed to preload location data:", error);
          toast({ title: "Error", description: "No se pudieron cargar los datos de ubicación para la edición.", variant: "destructive" });
      } finally {
          setEditingCondoData(initialData);
          setIsPreparingEdit(false);
          setIsEditCondoDialogOpen(true);
      }
  };
  
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
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
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
                            <DropdownMenuItem onSelect={() => prepareAndOpenEditDialog(condo)} disabled={isPreparingEdit}>
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
                        formAction={handleEditCondoAction}
                        initialData={editingCondoData}
                        isEditMode={true}
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
