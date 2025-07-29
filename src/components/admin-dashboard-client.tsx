

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
  Mail,
  Mailbox,
  GripVertical,
  Send,
  Lock,
  EyeOff,
  Bell,
  RefreshCw,
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
import { handleLogoutAction, getSettings, updateSettings, createAdmin, getAdmins, updateAdmin, deleteAdmin, sendAdminCredentialsEmail, sendEmailChangePin, updateAdminAccount, verifyAdminEmailChangePin, type Admin } from '@/actions/auth';
import { createCondominio, getCondominios, updateCondominio, deleteCondominio, type Condominio } from '@/actions/condos';
import { createSmtpConfiguration, getSmtpConfigurations, updateSmtpConfiguration, deleteSmtpConfiguration, updateSmtpOrder, testSmtpConfiguration, type SmtpConfiguration } from '@/actions/smtp';
import { geocodeAddress, type GeocodeResult } from '@/actions/geocoding';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';


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

function SmtpConfigDialog() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [configs, setConfigs] = useState<SmtpConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SmtpConfiguration | null>(null);
  
  const draggedItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    const result = await getSmtpConfigurations();
    setConfigs(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleDragSort = async () => {
    if (draggedItem.current === null || dragOverItem.current === null) return;
    const configsClone = [...configs];
    const dragged = configsClone.splice(draggedItem.current!, 1)[0];
    configsClone.splice(dragOverItem.current!, 0, dragged);
    
    setConfigs(configsClone);
    
    const orderedIds = configsClone.map(c => c.id);
    draggedItem.current = null;
    dragOverItem.current = null;

    startSubmitting(async () => {
       const result = await updateSmtpOrder(orderedIds);
       if (result.success) {
           toast({ title: t('toast.successTitle'), description: result.message });
       } else {
           toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
           fetchConfigs(); // Revert on error
       }
    });
  };
  
  const onFormSuccess = useCallback(() => {
      setIsFormOpen(false);
      setEditingConfig(null);
      fetchConfigs();
  }, [fetchConfigs]);

  const handleEditClick = (config: SmtpConfiguration) => {
      setEditingConfig(config);
      setIsFormOpen(true);
  };
  
  const handleDelete = (id: string) => {
    startSubmitting(async () => {
       const result = await deleteSmtpConfiguration(id);
       if(result.success) {
           toast({ title: t('toast.successTitle'), description: result.message });
           fetchConfigs();
       } else {
           toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
       }
    });
  }

  const handleTest = (id: string) => {
      setTestingId(id);
      startSubmitting(async () => {
          const result = await testSmtpConfiguration(id);
          if (result.success) {
              toast({ title: t('toast.successTitle'), description: result.message, duration: 9000 });
          } else {
              toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive', duration: 9000 });
          }
          setTestingId(null);
      });
  }

  return (
    <>
      <DialogContent className="sm:max-w-2xl">
        <div className={cn("relative", (isSubmitting && !testingId) && "opacity-50")}>
            {isSubmitting && !testingId && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
            <DialogHeader>
                <DialogTitle>Configurar envío de correo (SMTP)</DialogTitle>
                <DialogDescription>
                    Gestiona los servidores de correo para el envío de notificaciones. Arrastra para reordenar la prioridad de envío.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
                {isLoading ? (
                    Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                ) : configs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No hay configuraciones SMTP.</p>
                ) : (
                    configs.map((config, index) => (
                        <div 
                            key={config.id} 
                            className="flex items-center gap-2 p-2 border rounded-lg bg-card"
                            draggable
                            onDragStart={() => draggedItem.current = index}
                            onDragEnter={() => dragOverItem.current = index}
                            onDragEnd={handleDragSort}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            <div className="flex-grow">
                                <p className="font-medium">{config.name} <span className="text-muted-foreground text-sm">({config.host})</span></p>
                                <p className="text-sm text-muted-foreground">{config.auth_user}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleTest(config.id)} disabled={isSubmitting}>
                                {testingId === config.id ? <Loader className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(config)} disabled={isSubmitting}><Edit className="h-4 w-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isSubmitting}><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>Esto eliminará permanentemente la configuración SMTP "{config.name}".</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(config.id)} className={buttonVariants({variant: 'destructive'})}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))
                )}
            </div>
            
            <DialogFooter className="sm:justify-between">
                <DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose>
                <Button onClick={() => { setEditingConfig(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4"/>Agregar Configuración
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
      
      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SmtpFormDialog config={editingConfig} onSuccess={onFormSuccess} onCancel={() => setIsFormOpen(false)} />
      </Dialog>
    </>
  );
}

function SmtpFormDialog({ config, onSuccess, onCancel }: { config: SmtpConfiguration | null, onSuccess: () => void, onCancel: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!config;
    const formAction = isEditMode ? updateSmtpConfiguration : createSmtpConfiguration;
    
    // We pass a function to useActionState to handle the success case without causing infinite loops.
    const [state, dispatch] = useActionState(formAction, undefined);
    
    const onFormSuccessCallback = useCallback(() => {
        onSuccess();
    }, [onSuccess]);

    useEffect(() => {
        if (!state) return;
        if (state.success === false) {
            toast({ title: t('toast.errorTitle'), description: state.message, variant: 'destructive' });
        }
        if (state.success === true) {
            toast({ title: t('toast.successTitle'), description: state.message });
            onFormSuccessCallback();
        }
    }, [state, t, toast, onFormSuccessCallback]);
    
    return (
        <DialogContent className="sm:max-w-lg">
            <form action={dispatch}>
                 <SmtpFormFields config={config} onCancel={onCancel} />
            </form>
        </DialogContent>
    )
}

function SmtpFormFields({ config, onCancel }: { config: SmtpConfiguration | null, onCancel: () => void}) {
    const { pending } = useFormStatus();
    const isEditMode = !!config;

    return (
        <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={isEditMode ? "Actualizando..." : "Creando..."} />}
            <DialogHeader>
                <DialogTitle>{isEditMode ? 'Editar Configuración SMTP' : 'Nueva Configuración SMTP'}</DialogTitle>
            </DialogHeader>
            <input type="hidden" name="id" value={config?.id || ''} />
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" name="name" defaultValue={config?.name} placeholder="Mi Cuenta de Gmail" required disabled={pending}/>
                </div>
                    <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2 col-span-2">
                        <Label htmlFor="host">Host SMTP</Label>
                        <Input id="host" name="host" defaultValue={config?.host} placeholder="smtp.gmail.com" required disabled={pending}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="port">Puerto</Label>
                        <Input id="port" name="port" type="number" defaultValue={config?.port} placeholder="587" required disabled={pending}/>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="auth_user">Usuario (Email)</Label>
                    <Input id="auth_user" name="auth_user" type="email" defaultValue={config?.auth_user} placeholder="tu@email.com" required disabled={pending}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="auth_pass">Contraseña</Label>
                    <Input id="auth_pass" name="auth_pass" type="password" placeholder={isEditMode ? 'Dejar en blanco para no cambiar' : '••••••••'} required={!isEditMode} disabled={pending}/>
                </div>
                    <div className="flex items-center space-x-2">
                    <Switch id="secure" name="secure" defaultChecked={config?.secure ?? true} disabled={pending}/>
                    <Label htmlFor="secure">Usar Conexión Segura (TLS)</Label>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{isEditMode ? 'Guardar Cambios' : 'Crear'}</Button>
            </DialogFooter>
        </div>
    )
}

function ManageAdminsDialog({ currentAdminId }: { currentAdminId: string }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();

    const fetchAdmins = useCallback(async () => {
        setLoadingAdmins(true);
        const result = await getAdmins();
        if (result.admins) {
            setAdmins(result.admins);
        } else {
            toast({ title: t('toast.errorTitle'), description: result.error, variant: 'destructive' });
        }
        setLoadingAdmins(false);
    }, [toast, t]);

    useEffect(() => {
        if (isOpen && view === 'list') {
            fetchAdmins();
        }
    }, [isOpen, view, fetchAdmins]);
    
    const handleDelete = (admin: Admin) => {
       startSubmitting(async () => {
           const result = await deleteAdmin(admin.id);
           if (result.success) {
               toast({ title: t('toast.successTitle'), description: result.message });
               fetchAdmins();
           } else {
               toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
           }
       });
    };

    const handleSendEmail = (adminId: string) => {
        startSubmitting(async () => {
            const appUrl = window.location.origin;
            const result = await sendAdminCredentialsEmail(adminId, appUrl);
             if (result.success) {
               toast({ title: t('toast.successTitle'), description: result.message });
           } else {
               toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
           }
        });
    }

    const onFormSuccess = () => {
        setView('list');
        fetchAdmins();
    };

    const handleEditClick = (admin: Admin) => {
        setSelectedAdmin(admin);
        setView('edit');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.manageAdmins.title')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                 <div className={cn("relative transition-opacity", isSubmitting && "opacity-50")}>
                    {isSubmitting && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
                    
                    {view === 'list' && (
                        <>
                        <DialogHeader>
                            <DialogTitle>{t('adminDashboard.manageAdmins.title')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.manageAdmins.listDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('adminDashboard.manageAdmins.table.name')}</TableHead>
                                        <TableHead>{t('adminDashboard.manageAdmins.table.email')}</TableHead>
                                        <TableHead>{t('adminDashboard.manageAdmins.table.permissions')}</TableHead>
                                        <TableHead><span className="sr-only">{t('adminDashboard.table.actions')}</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingAdmins ? (
                                        Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)
                                    ) : admins.map(admin => {
                                        const isSelf = admin.id === currentAdminId;
                                        return (
                                        <TableRow key={admin.id} className={cn(isSelf && "bg-muted/50")}>
                                            <TableCell>{admin.name} {isSelf && <span className="text-xs text-muted-foreground ml-1">({t('common.you')})</span>}</TableCell>
                                            <TableCell>{admin.email}</TableCell>
                                            <TableCell>{admin.can_create_admins ? t('adminDashboard.manageAdmins.canCreateAdminsLabel') : '---'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isSelf}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => handleEditClick(admin)}><Edit className="mr-2 h-4 w-4"/>{t('adminDashboard.table.edit')}</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleSendEmail(admin.id)}><Mail className="mr-2 h-4 w-4"/>{t('adminDashboard.manageAdmins.sendCredentials')}</DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>{t('adminDashboard.table.delete')}</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>{t('adminDashboard.deleteCondoDialog.title')}</AlertDialogTitle>
                                                                    <AlertDialogDescription>{t('adminDashboard.manageAdmins.deleteConfirmation', {name: admin.name})}</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>{t('adminDashboard.newCondoDialog.cancel')}</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(admin)} className={buttonVariants({variant: 'destructive'})}>{t('adminDashboard.table.delete')}</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter className="sm:justify-between">
                            <DialogClose asChild><Button variant="outline">{t('common.close')}</Button></DialogClose>
                            <Button onClick={() => setView('create')}><UserPlus className="mr-2 h-4 w-4"/>{t('adminDashboard.manageAdmins.createButton')}</Button>
                        </DialogFooter>
                        </>
                    )}

                    {view === 'create' && <AdminForm onSuccess={onFormSuccess} onCancel={() => setView('list')} />}
                    {view === 'edit' && selectedAdmin && <AdminForm admin={selectedAdmin} onSuccess={onFormSuccess} onCancel={() => setView('list')} />}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function AdminForm({ admin, onSuccess, onCancel }: { admin?: Admin, onSuccess: () => void, onCancel: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!admin;
    const formAction = isEditMode ? updateAdmin : createAdmin;
    const [state, dispatch] = useActionState(formAction, undefined);
    
    useEffect(() => {
        if (state?.success === false) {
            toast({ title: t('toast.errorTitle'), description: state.message, variant: 'destructive' });
        }
        if (state?.success === true) {
            toast({ title: t('toast.successTitle'), description: state.message });
            onSuccess();
        }
    }, [state, t, toast, onSuccess]);
    
    return (
        <form action={dispatch}>
            <AdminFormFields admin={admin} onCancel={onCancel}/>
        </form>
    );
}

function AdminFormFields({ admin, onCancel }: { admin?: Admin, onCancel: () => void }) {
    const { t } = useLocale();
    const { pending } = useFormStatus();
    const isEditMode = !!admin;

    return (
         <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
            <DialogHeader>
                <DialogTitle>{isEditMode ? t('adminDashboard.manageAdmins.editTitle') : t('adminDashboard.manageAdmins.createTitle')}</DialogTitle>
                <DialogDescription>{t('adminDashboard.manageAdmins.formDescription')}</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="id" value={admin?.id || ''} />
             <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t('adminDashboard.manageAdmins.nameLabel')}</Label>
                    <Input id="name" name="name" defaultValue={admin?.name} placeholder="John Doe" required disabled={pending}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('adminDashboard.manageAdmins.emailLabel')}</Label>
                    <Input id="email" name="email" type="email" defaultValue={admin?.email} placeholder="admin@example.com" required autoComplete="email" disabled={pending}/>
                </div>
                {!isEditMode && <div className="grid gap-2">
                    <Label htmlFor="password">{t('adminDashboard.manageAdmins.passwordLabel')}</Label>
                    <Input id="password" name="password" type="password" required autoComplete="new-password" disabled={pending}/>
                </div>}
                <div className="flex items-center space-x-2">
                   <Checkbox id="can_create_admins" name="can_create_admins" defaultChecked={admin?.can_create_admins} disabled={pending}/>
                   <Label htmlFor="can_create_admins" className="text-sm font-normal">
                        {t('adminDashboard.manageAdmins.canCreateAdminsLabel')}
                    </Label>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>{t('adminDashboard.newCondoDialog.cancel')}</Button>
                <Button type="submit" disabled={pending}>
                    {isEditMode ? t('adminDashboard.editCondoDialog.save') : t('adminDashboard.manageAdmins.createButton')}
                </Button>
            </DialogFooter>
        </div>
    )
}

function ManageAccountDialog({ session }: { session: Session }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const router = useRouter();
    const [state, formAction] = useActionState(updateAdminAccount, undefined);

    useEffect(() => {
        if (state?.success === false) {
            toast({ title: t('toast.errorTitle'), description: state.message, variant: 'destructive' });
        }
        if (state?.success === true) {
            toast({ title: t('toast.successTitle'), description: state.message });
            if (state.message.includes('cerrará la sesión')) {
                setTimeout(() => handleLogoutAction(), 3000);
            } else {
                router.refresh();
            }
        }
    }, [state, t, toast, router]);

    return (
        <DialogContent className="sm:max-w-md">
            <form action={formAction}>
                 <ManageAccountFields session={session} />
            </form>
        </DialogContent>
    );
}

function ManageAccountFields({ session }: { session: Session }) {
    const { pending } = useFormStatus();
    const { t } = useLocale();
    const { toast } = useToast();

    // State for inputs
    const [emailValue, setEmailValue] = useState(session.email);
    const [pinValue, setPinValue] = useState('');
    
    // State for UI control
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // State for async operations and verification flow
    const [isPinLoading, startPinTransition] = useTransition();
    const [pinVerificationState, setPinVerificationState] = useState<{ status: 'idle' | 'verified' | 'error', message: string }>({ status: 'idle', message: t('adminDashboard.account.pinValidation.initial') });

    const isEmailChanged = emailValue !== session.email;

    useEffect(() => {
        if (!isEmailChanged) {
             setPinVerificationState({ status: 'idle', message: t('adminDashboard.account.pinValidation.initial') });
             setPinValue('');
        }
    }, [isEmailChanged, t]);

    const handleSendPin = () => {
        startPinTransition(async () => {
            const result = await sendEmailChangePin(emailValue);
            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                setPinVerificationState({ status: 'idle', message: t('adminDashboard.account.pinValidation.sent') });
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };
    
    const handleVerifyPin = () => {
        startPinTransition(async () => {
            const result = await verifyAdminEmailChangePin(emailValue, pinValue);
             if (result.success) {
                setPinVerificationState({ status: 'verified', message: t('adminDashboard.account.pinValidation.success') });
                toast({ title: t('toast.successTitle'), description: result.message });
            } else {
                setPinVerificationState({ status: 'error', message: result.message });
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };

    const isSaveChangesDisabled = pending || (isEmailChanged && pinVerificationState.status !== 'verified');
    
    return (
         <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={t('adminDashboard.loadingOverlay.updating')} />}
            <DialogHeader>
                <DialogTitle>{t('adminDashboard.account.title')}</DialogTitle>
                <DialogDescription>{t('adminDashboard.account.description')}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-2 mt-4">
                    <TabsTrigger value="profile">{t('adminDashboard.account.profileTab')}</TabsTrigger>
                    <TabsTrigger value="security">{t('adminDashboard.account.securityTab')}</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader><CardTitle>{t('adminDashboard.account.profileTitle')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminDashboard.account.nameLabel')}</Label>
                                <Input id="name" name="name" defaultValue={session.name} required disabled={pending}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('adminDashboard.account.emailLabel')}</Label>
                                <Input id="email" name="email" type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} required disabled={pending}/>
                            </div>
                        </CardContent>
                    </Card>
                    {isEmailChanged && (
                        <Card className="p-4 bg-muted/50 border-dashed">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base">{t('adminDashboard.account.pinVerificationTitle')}</CardTitle>
                                <CardDescription className="text-xs">{t('adminDashboard.account.pinVerificationDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                                <div className="flex gap-2">
                                    <Input id="email_pin" name="email_pin" placeholder={t('adminDashboard.account.pinPlaceholder')} value={pinValue} onChange={e => setPinValue(e.target.value)} disabled={isPinLoading || pinVerificationState.status === 'verified'}/>
                                    <Button type="button" variant="outline" onClick={handleSendPin} disabled={isPinLoading}>
                                        {isPinLoading && pinVerificationState.status === 'idle' ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                        {t('adminDashboard.account.sendPinButton')}
                                    </Button>
                                </div>
                                <Button type="button" className="w-full" onClick={handleVerifyPin} disabled={!pinValue || isPinLoading || pinVerificationState.status === 'verified'}>
                                    {isPinLoading && pinVerificationState.status !== 'verified' ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                                    {t('adminDashboard.account.verifyPinButton')}
                                </Button>
                                <div className={cn("text-sm text-center p-2 rounded-md", 
                                    pinVerificationState.status === 'idle' && 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
                                    pinVerificationState.status === 'verified' && 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
                                    pinVerificationState.status === 'error' && 'bg-destructive/10 text-destructive'
                                )}>
                                    {pinVerificationState.message}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="security" className="pt-4">
                     <Card>
                        <CardHeader><CardTitle>{t('adminDashboard.account.passwordTitle')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid gap-2">
                                <Label htmlFor="current_password">{t('adminDashboard.account.currentPasswordLabel')}</Label>
                                <div className="relative">
                                    <Input id="current_password" name="current_password" type={showPassword ? "text" : "password"} autoComplete="current-password" disabled={pending}/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(p => !p)} disabled={pending}><Eye className="h-4 w-4"/></Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new_password">{t('adminDashboard.account.newPasswordLabel')}</Label>
                                 <div className="relative">
                                    <Input id="new_password" name="new_password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" disabled={pending}/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(p => !p)} disabled={pending}><Eye className="h-4 w-4"/></Button>
                                </div>
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="confirm_password">{t('adminDashboard.account.confirmPasswordLabel')}</Label>
                                <div className="relative">
                                    <Input id="confirm_password" name="confirm_password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" disabled={pending}/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(p => !p)} disabled={pending}><Eye className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-4 mt-4 border-t">
                 <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>{t('common.cancel')}</Button></DialogClose>
                <Button type="submit" disabled={isSaveChangesDisabled}>{t('common.saveChanges')}</Button>
            </DialogFooter>
        </div>
    );
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
            <AlertDescription isCopyable={true}>{error}</AlertDescription>
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
  const [state, dispatchFormAction, isFormPending] = useActionState(formAction, undefined);
  
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
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  
  const [editingCondoData, setEditingCondoData] = useState<Condominio & Partial<LocationData> | null>(null);
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
  
  const navigateToCondo = (condoId: string) => {
    router.push(`/admin/condominio/${condoId}`);
  };

  const handleCondoFormSuccess = () => {
      setIsNewCondoDialogOpen(false);
      setIsEditCondoDialogOpen(false);
      setEditingCondoData(null);
      fetchCondos();
  };

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
                 <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <User className="mr-2 h-4 w-4" />
                            <span>{t('adminDashboard.account.myAccount')}</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <ManageAccountDialog session={session} />
                </Dialog>
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
                            <DropdownMenuSeparator/>
                            {session.canCreateAdmins && <ManageAdminsDialog currentAdminId={session.id}/>}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Mailbox className="mr-2 h-4 w-4" />
                                        <span>Configurar SMTP</span>
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <SmtpConfigDialog />
                           </Dialog>
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
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
