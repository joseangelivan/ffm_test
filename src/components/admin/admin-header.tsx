
"use client";

import React, { useState, useEffect, useActionState, useRef, useTransition, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
} from '@/components/ui/alert-dialog';
import {
  Shield,
  LogOut,
  Settings,
  User,
  Languages,
  Moon,
  Sun,
  Loader,
  KeyRound,
  AlertCircle,
  Mail,
  Mailbox,
  GripVertical,
  Send,
  Lock,
  EyeOff,
  Bell,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Eye,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/lib/utils';
import { useAdminDashboard } from '../admin-dashboard-client';
import { 
    handleLogoutAction,
    createAdmin, 
    getAdmins, 
    updateAdmin, 
    deleteAdmin, 
    sendAdminFirstLoginEmail, 
    sendEmailChangePin, 
    updateAdminAccount, 
    verifyAdminEmailChangePin,
    type Admin 
} from '@/actions/auth';
import { 
    createSmtpConfiguration, 
    getSmtpConfigurations, 
    updateSmtpConfiguration, 
    deleteSmtpConfiguration, 
    updateSmtpOrder, 
    testSmtpConfiguration, 
    type SmtpConfiguration 
} from '@/actions/smtp';

function LoadingOverlay({ text }: { text: string }) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{text}</span>
            </div>
        </div>
    );
}

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

function SmtpFormDialog({ config, onSuccess, onCancel }: { config: SmtpConfiguration | null, onSuccess: () => void, onCancel: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!config;
    const formAction = isEditMode ? updateSmtpConfiguration : createSmtpConfiguration;
    
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
        <DialogContent className="sm:max-w-lg">
            <form action={dispatch}>
                 <SmtpFormFields config={config} onCancel={onCancel} />
            </form>
        </DialogContent>
    )
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

function AdminFormFields({ admin, onCancel }: { admin?: Admin, onCancel: () => void }) {
    const { t, locale } = useLocale();
    const { pending } = useFormStatus();
    const isEditMode = !!admin;
    const [pin, setPin] = useState('');

    const generatePin = () => {
        const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
        setPin(randomPin);
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers
        if (/^[0-9]*$/.test(value)) {
            setPin(value);
        }
    };

    return (
         <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
            <DialogHeader>
                <DialogTitle>{isEditMode ? t('adminDashboard.manageAdmins.editTitle') : t('adminDashboard.manageAdmins.createTitle')}</DialogTitle>
                <DialogDescription>{t('adminDashboard.manageAdmins.formDescription')}</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="id" value={admin?.id || ''} />
            <input type="hidden" name="locale" value={locale} />
             <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t('adminDashboard.manageAdmins.nameLabel')}</Label>
                    <Input id="name" name="name" defaultValue={admin?.name} placeholder="John Doe" required disabled={pending}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('adminDashboard.manageAdmins.emailLabel')}</Label>
                    <Input id="email" name="email" type="email" defaultValue={admin?.email} placeholder="admin@example.com" required autoComplete="email" disabled={pending}/>
                </div>
                {!isEditMode && (
                    <div className="grid gap-2">
                        <Label htmlFor="pin">{t('adminDashboard.manageAdmins.pinLabel')}</Label>
                        <div className="flex items-center gap-2">
                            <Input id="pin" name="pin" type="text" placeholder="123456" required maxLength={6} pattern="\d{6}" disabled={pending} value={pin} onChange={handlePinChange}/>
                            <Button type="button" variant="outline" onClick={generatePin} disabled={pending}>
                                <RefreshCw className="mr-2 h-4 w-4"/>
                                {t('adminDashboard.manageAdmins.generatePinButton')}
                            </Button>
                        </div>
                    </div>
                )}
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

function AdminForm({ admin, onSuccess, onCancel }: { admin?: Admin, onSuccess: () => void, onCancel: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!admin;
    const formAction = isEditMode ? updateAdmin : createAdmin;

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result?.success === false) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        if (result?.success === true) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        }
        return result;
    };
    
    const [state, dispatch] = useActionState(handleAction, undefined);
    
    return (
        <form action={dispatch}>
            <AdminFormFields admin={admin} onCancel={onCancel}/>
        </form>
    );
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
            const result = await sendAdminFirstLoginEmail(adminId, appUrl);
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
                                                        <DropdownMenuItem onSelect={() => handleSendEmail(admin.id)}><Mail className="mr-2 h-4 w-4"/>{t('adminDashboard.manageAdmins.resendActivation')}</DropdownMenuItem>
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

function ManageAccountFields({ formState }: { formState: any }) {
    const { pending } = useFormStatus();
    const { t, locale } = useLocale();
    const { toast } = useToast();
    const { session } = useAdminDashboard();


    const [emailValue, setEmailValue] = useState(session.email);
    const [pinValue, setPinValue] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
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
                     {formState?.success === false && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                            <AlertDescription variant="destructive">{formState.message}</AlertDescription>
                        </Alert>
                    )}
                    <Card>
                        <CardHeader><CardTitle>{t('adminDashboard.account.profileTitle')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <input type="hidden" name="locale" value={locale} />
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
                 <Button type="button" variant="outline" asChild>
                    <DialogClose disabled={pending}>{t('common.cancel')}</DialogClose>
                 </Button>
                <Button type="submit" disabled={isSaveChangesDisabled}>{t('common.saveChanges')}</Button>
            </DialogFooter>
        </div>
    );
}

function ManageAccountDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: any) => void;
}) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [state, formAction] = useActionState(updateAdminAccount, undefined);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: t('toast.successTitle'),
        description: state.message,
      });
      onSuccess(state.data);
      onOpenChange(false);
    }
  }, [state, toast, t, onSuccess, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <ManageAccountFields formState={state} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminHeader({ onAccountUpdateSuccess }: { onAccountUpdateSuccess: (data: any) => void }) {
    const { session, theme, handleSetTheme, handleSetLocale } = useAdminDashboard();
    const { t, locale } = useLocale();
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

    return (
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
                        <ManageAccountDialog
                            isOpen={isAccountDialogOpen}
                            onOpenChange={setIsAccountDialogOpen}
                            onSuccess={onAccountUpdateSuccess}
                        />
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
    );
}
