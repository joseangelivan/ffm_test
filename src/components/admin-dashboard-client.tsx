

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
  AlertCircle
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
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    number?: string;
};

const LocationSelector = ({
    defaultValues,
    onLocationChange,
    isFormDisabled
}: {
    defaultValues: Partial<LocationData>,
    onLocationChange: (name: string, value: string) => void,
    isFormDisabled?: boolean
}) => {
    const { t } = useLocale();
    const [isPending, startTransition] = useTransition();

    const [allCountries, setAllCountries] = useState<any[]>([]);
    const [continents, setContinents] = useState<string[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    const [selectedContinent, setSelectedContinent] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(defaultValues.country || "");
    const [selectedState, setSelectedState] = useState(defaultValues.state || "");

    const [loadingContinents, setLoadingContinents] = useState(true);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingContinents(true);
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=name,region,cca2');
                const data = await response.json();
                if (response.ok) {
                    const countryData = data.map((c: any) => ({
                        name: c.name.common,
                        code: c.cca2,
                        continent: c.region
                    })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                    
                    const uniqueContinents = [...new Set(countryData.map((c:any) => c.continent))].filter(Boolean).sort();
                    setContinents(uniqueContinents);
                    setAllCountries(countryData);

                    if (defaultValues.country) {
                        const currentCountry = countryData.find((c: any) => c.name === defaultValues.country);
                        if (currentCountry) {
                            startTransition(() => {
                                setSelectedContinent(currentCountry.continent);
                                setCountries(countryData.filter(c => c.continent === currentCountry.continent));
                                setSelectedCountry(currentCountry.name);
                            });
                        }
                    }
                     if (defaultValues.state) {
                        setSelectedState(defaultValues.state);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch countries:", error);
            } finally {
                setLoadingContinents(false);
            }
        };
        fetchInitialData();
    }, [defaultValues.country, defaultValues.state]);

    useEffect(() => {
        const fetchStates = async () => {
            if (!selectedCountry) {
                setStates([]);
                setSelectedState("");
                onLocationChange('state', '');
                return;
            }
            setLoadingStates(true);
            try {
                const response = await fetch(`https://countriesnow.space/api/v0.1/countries/states`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ country: selectedCountry })
                });
                const data = await response.json();
                if (!data.error && data.data?.states) {
                    const stateNames = data.data.states.map((s: any) => s.name).sort();
                    startTransition(() => {
                        setStates(stateNames);
                        if (defaultValues.state && stateNames.includes(defaultValues.state)) {
                            setSelectedState(defaultValues.state);
                        } else {
                            if (!stateNames.includes(selectedState)) {
                                setSelectedState("");
                                onLocationChange('state', '');
                            }
                        }
                    });
                } else {
                    setStates([]);
                }
            } catch (error) {
                console.error("Failed to fetch states:", error);
                setStates([]);
            } finally {
                setLoadingStates(false);
            }
        };
        if(selectedCountry) fetchStates();
    }, [selectedCountry, defaultValues.state]);


    useEffect(() => {
        const fetchCities = async () => {
             if (!selectedCountry || !selectedState) {
                setCities([]);
                onLocationChange('city', '');
                return;
            }
            setLoadingCities(true);
            try {
                 const response = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ country: selectedCountry, state: selectedState })
                });
                const data = await response.json();
                if (!data.error && Array.isArray(data.data)) {
                    startTransition(() => {
                        setCities(data.data.sort());
                    });
                } else {
                    setCities([]);
                }
            } catch (error) {
                console.error("Failed to fetch cities:", error);
                setCities([]);
            } finally {
                setLoadingCities(false);
            }
        };

        if(selectedState) fetchCities();
    }, [selectedCountry, selectedState]);


    const handleContinentChange = (continent: string) => {
        startTransition(() => {
            setSelectedContinent(continent);
            setCountries(allCountries.filter(c => c.continent === continent));
            setSelectedCountry('');
            onLocationChange('country', '');
            setStates([]);
            setSelectedState('');
            onLocationChange('state', '');
            setCities([]);
            onLocationChange('city', '');
        });
    }

    const handleCountryChange = (countryName: string) => {
        startTransition(() => {
            setSelectedCountry(countryName);
            onLocationChange('country', countryName);
            setStates([]);
            setSelectedState('');
            onLocationChange('state', '');
            setCities([]);
            onLocationChange('city', '');
        });
    }

    const handleStateChange = (stateName: string) => {
        startTransition(() => {
            setSelectedState(stateName);
            onLocationChange('state', stateName);
            setCities([]);
            onLocationChange('city', '');
        });
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 col-span-2">
                <Label htmlFor="continent-display">Continente</Label>
                <Select onValueChange={handleContinentChange} value={selectedContinent} disabled={loadingContinents || isFormDisabled}>
                    <SelectTrigger id="continent-display">
                        <SelectValue placeholder={loadingContinents ? "Cargando continentes..." : "Seleccionar continente"} />
                    </SelectTrigger>
                    <SelectContent>
                        {continents.map((continent: any) => <SelectItem key={continent} value={continent}>{continent}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="country-display">{t('adminDashboard.newCondoDialog.countryLabel')}</Label>
                <Select onValueChange={handleCountryChange} value={selectedCountry} disabled={!selectedContinent || loadingCountries || isFormDisabled}>
                    <SelectTrigger id="country-display">
                        <SelectValue placeholder={loadingCountries || isPending ? "Cargando países..." : "Seleccionar país"} />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((country: any) => <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="state-display">{t('adminDashboard.newCondoDialog.stateLabel')}</Label>
                <Select onValueChange={handleStateChange} value={selectedState} disabled={!selectedCountry || loadingStates || isFormDisabled}>
                    <SelectTrigger id="state-display">
                         <SelectValue placeholder={loadingStates || isPending ? "Cargando estados..." : "Seleccionar estado"} />
                    </SelectTrigger>
                    <SelectContent>
                       {states.map((state: any) => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="grid gap-2 col-span-2">
                <Label htmlFor="city-display">{t('adminDashboard.newCondoDialog.cityLabel')}</Label>
                 <Select onValueChange={(value) => onLocationChange('city', value)} value={defaultValues.city} disabled={!selectedState || loadingCities || isFormDisabled}>
                    <SelectTrigger id="city-display">
                        <SelectValue placeholder={loadingCities || isPending ? "Cargando ciudades..." : "Seleccionar ciudad"} />
                    </SelectTrigger>
                    <SelectContent>
                        {cities.map((city: any) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
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
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
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

function CondoForm({
  closeDialog,
  formAction,
  initialData,
  isEditMode,
}: {
  closeDialog: () => void;
  formAction: (prevState: any, formData: FormData) => Promise<any>;
  initialData?: Condominio | null;
  isEditMode: boolean;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [state, dispatchFormAction] = useActionState(formAction, undefined);
  const { pending } = useFormStatus();

  const [locationData, setLocationData] = useState<Partial<LocationData>>({
    country: initialData?.country || '',
    state: initialData?.state || '',
    city: initialData?.city || '',
  });

   useEffect(() => {
        if (isEditMode && initialData) {
            setLocationData({
                country: initialData.country,
                state: initialData.state,
                city: initialData.city,
            });
        }
    }, [initialData, isEditMode]);

  const handleLocationChange = useCallback((name: string, value: string) => {
    setLocationData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <form action={dispatchFormAction}>
      <input type="hidden" name="country" value={locationData.country} />
      <input type="hidden" name="state" value={locationData.state} />
      <input type="hidden" name="city" value={locationData.city} />

      <div className={cn('relative transition-opacity', pending && 'opacity-50')}>
        {pending && (
          <LoadingOverlay
            text={
              isEditMode
                ? t('adminDashboard.editCondoDialog.save')
                : t('adminDashboard.loadingOverlay.creating')
            }
          />
        )}
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
              disabled={pending}
            />
          </div>

          <LocationSelector
            onLocationChange={handleLocationChange}
            defaultValues={locationData}
            isFormDisabled={pending}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="street">
                {t('adminDashboard.newCondoDialog.streetLabel')}
              </Label>
              <Input
                id="street"
                name="street"
                defaultValue={initialData?.street}
                placeholder="Ex: Rua das Flores"
                required
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="number">
                {t('adminDashboard.newCondoDialog.numberLabel')}
              </Label>
              <Input
                id="number"
                name="number"
                defaultValue={initialData?.number}
                placeholder="Ex: 123"
                required
                disabled={pending}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              {t('adminDashboard.newCondoDialog.cancel')}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending}>
            {pending
              ? isEditMode
                ? t('adminDashboard.editCondoDialog.save') + '...'
                : t('adminDashboard.newCondoDialog.create') + '...'
              : isEditMode
              ? t('adminDashboard.editCondoDialog.save')
              : t('adminDashboard.newCondoDialog.create')}
          </Button>
        </DialogFooter>
      </div>
    </form>
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
  const [editingCondo, setEditingCondo] = useState<Condominio | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const fetchCondos = async () => {
      setLoading(true);
      const result = await getCondominios();
      if(result.success && result.data) {
          setCondominios(result.data);
      } else {
          toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
      }
      setLoading(false);
  }

  useEffect(() => {
    fetchCondos();
  }, []);

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

  const handleEditCondo = async (prevState: any, formData: FormData) => {
    if (!editingCondo) return { success: false, message: "No condo selected for editing."};
    formData.append('id', editingCondo.id);
    
    const result = await updateCondominio(prevState, formData);
    if (result.success) {
        fetchCondos();
    }
    return result;
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

  const openEditDialog = (condo: Condominio) => {
    setEditingCondo(condo);
    setIsEditCondoDialogOpen(true);
  };
  
  const navigateToCondo = (condoId: string) => {
    router.push(`/admin/condominio/${condoId}`);
  };

  const handleCondoFormSuccess = () => {
      setIsNewCondoDialogOpen(false);
      setIsEditCondoDialogOpen(false);
      setEditingCondo(null);
      fetchCondos();
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
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
                    <CondoForm
                        closeDialog={handleCondoFormSuccess}
                        formAction={createCondominio}
                        isEditMode={false}
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
                            <DropdownMenuItem onSelect={() => openEditDialog(condo)}>
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
            if (!isOpen) setEditingCondo(null);
            setIsEditCondoDialogOpen(isOpen);
        }}>
            <DialogContent>
                {editingCondo && (
                    <CondoForm
                        closeDialog={handleCondoFormSuccess}
                        formAction={handleEditCondo}
                        initialData={editingCondo}
                        isEditMode={true}
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
