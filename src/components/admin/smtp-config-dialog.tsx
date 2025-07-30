
"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition, useRef } from 'react';
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
} from '@/components/ui/alert-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    createSmtpConfiguration, 
    getSmtpConfigurations, 
    updateSmtpConfiguration, 
    deleteSmtpConfiguration, 
    updateSmtpOrder, 
    testSmtpConfiguration, 
    type SmtpConfiguration 
} from '@/actions/smtp';
import { 
    Mailbox, 
    GripVertical, 
    Send, 
    Loader, 
    Edit, 
    Trash2, 
    PlusCircle 
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';

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

export function SmtpConfigDialog() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [configs, setConfigs] = useState<SmtpConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
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
    if (isListOpen) {
        fetchConfigs();
    }
  }, [fetchConfigs, isListOpen]);

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
      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Mailbox className="mr-2 h-4 w-4" />
                <span>Configurar SMTP</span>
            </DropdownMenuItem>
        </DialogTrigger>
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
      </Dialog>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SmtpFormDialog config={editingConfig} onSuccess={onFormSuccess} onCancel={() => setIsFormOpen(false)} />
      </Dialog>
    </>
  );
}
