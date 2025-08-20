
"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Trash2,
  PlusCircle,
  MoreVertical,
  Settings,
  Edit,
  Loader,
  Copy
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
  DialogClose
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
import type { Device } from '@/actions/devices';
import { getProtocols, getDeviceTypes, type Protocol, type DeviceType } from '@/actions/catalogs';
import { createOrUpdateDeviceCommunication, createDevice, deleteDevice } from '@/actions/devices';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { LoadingOverlay } from '../admin/admin-header';

function ManageDeviceForm({
    device,
    protocols,
    onSuccess,
}: {
    device: Device;
    protocols: Protocol[];
    onSuccess: () => void;
}) {
    const { t } = useLocale();
    const { toast } = useToast();

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await createOrUpdateDeviceCommunication(prevState, formData);
        if (result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    }
    
    const [state, formAction] = useActionState(handleAction, null);
    const { pending } = useFormStatus();

    return (
        <DialogContent>
             <form action={formAction}>
                 <div className={cn("relative transition-opacity", pending && "opacity-50")}>
                    {pending && <LoadingOverlay text={t('adminDashboard.loadingOverlay.updating')} />}
                    <DialogHeader>
                        <DialogTitle>{t('condoDashboard.devices.manageDialog.title', { name: device.name })}</DialogTitle>
                        <DialogDescription>{t('condoDashboard.devices.manageDialog.description')}</DialogDescription>
                    </DialogHeader>
                    <input type="hidden" name="device_id" value={device.id} />
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="protocol_id">{t('condoDashboard.devices.manageDialog.protocol')}</Label>
                            <Select name="protocol_id" defaultValue={device.protocol_id || ''} required disabled={pending}>
                                <SelectTrigger id="protocol_id">
                                    <SelectValue placeholder={t('condoDashboard.devices.manageDialog.selectProtocol')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {protocols.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="physical_device_id">{t('condoDashboard.devices.manageDialog.physicalDeviceId')}</Label>
                            <Input id="physical_device_id" name="physical_device_id" defaultValue={device.physical_device_id || ''} placeholder="ID físico del dispositivo" disabled={pending} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>{t('common.cancel')}</Button></DialogClose>
                         <Button type="submit" disabled={pending}>{t('common.save')}</Button>
                    </DialogFooter>
                </div>
            </form>
        </DialogContent>
    )
}

function CreateDeviceForm({
    condoId,
    deviceTypes,
    onSuccess,
}: {
    condoId: string;
    deviceTypes: DeviceType[];
    onSuccess: () => void;
}) {
    const { t, locale } = useLocale();
    const { toast } = useToast();
    
    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await createDevice(prevState, formData);
        if (result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    };

    const [state, formAction] = useActionState(handleAction, null);
    const { pending } = useFormStatus();

    return (
        <DialogContent>
             <form action={formAction}>
                 <div className={cn("relative transition-opacity", pending && "opacity-50")}>
                    {pending && <LoadingOverlay text={t('adminDashboard.loadingOverlay.creating')} />}
                    <DialogHeader>
                        <DialogTitle>{t('condoDashboard.devices.addDeviceButton')}</DialogTitle>
                    </DialogHeader>
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('condoDashboard.devices.table.name')}</Label>
                            <Input id="name" name="name" required disabled={pending} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="device_type_id">{t('condoDashboard.devices.table.type')}</Label>
                            <Select name="device_type_id" required disabled={pending}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('addDeviceDialog.selectTypePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {deviceTypes.map(dt => (
                                        <SelectItem key={dt.id} value={dt.id}>
                                            {dt.name_translations[locale as 'es' | 'pt-BR'] || dt.name_translations['pt-BR']}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>{t('common.cancel')}</Button></DialogClose>
                        <Button type="submit" disabled={pending}>{t('common.create')}</Button>
                    </DialogFooter>
                </div>
            </form>
        </DialogContent>
    );
}

export default function ManageDevicesTab({
    condoId,
    devices: initialDevices,
    onDataNeedsRefresh,
}: {
    condoId: string;
    devices: Device[];
    onDataNeedsRefresh: () => void;
}) {
    const { t, locale } = useLocale();
    const { toast } = useToast();
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
    
    const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
    const [isSubmitting, startSubmittingTransition] = useTransition();

    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    const fetchCatalogs = useCallback(async () => {
        setIsLoadingCatalogs(true);
        try {
            const [protocolsData, deviceTypesData] = await Promise.all([
                getProtocols(),
                getDeviceTypes()
            ]);
            setProtocols(protocolsData || []);
            setDeviceTypes(deviceTypesData || []);
        } catch (error) {
            console.error("Failed to fetch device catalogs:", error);
            toast({ title: t('toast.errorTitle'), description: "Error al cargar los catálogos.", variant: 'destructive' });
        } finally {
            setIsLoadingCatalogs(false);
        }
    }, [toast, t]);

    useEffect(() => {
        fetchCatalogs();
    }, [fetchCatalogs]);

    useEffect(() => {
        setDevices(initialDevices);
    }, [initialDevices]);

    const handleDeleteDevice = (device: Device) => {
        startSubmittingTransition(async () => {
            const result = await deleteDevice(device.id);
            if (result.success) {
                 toast({ title: t('toast.successTitle'), description: result.message });
                 onDataNeedsRefresh();
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }
    
    const openManageDialog = (device: Device) => {
        setSelectedDevice(device);
        setIsManageDialogOpen(true);
    }
    
    const onFormSuccess = () => {
        setIsManageDialogOpen(false);
        setIsCreateDialogOpen(false);
        setSelectedDevice(null);
        onDataNeedsRefresh();
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('condoDashboard.devices.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.devices.description')}</CardDescription>
                </div>
                 <Button size="sm" className="gap-1" onClick={() => setIsCreateDialogOpen(true)} disabled={isLoadingCatalogs}>
                    {isLoadingCatalogs ? <Loader className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4" />}
                    {t('condoDashboard.devices.addDeviceButton')}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('condoDashboard.devices.table.name')}</TableHead>
                            <TableHead>{t('condoDashboard.devices.table.type')}</TableHead>
                            <TableHead>{t('condoDashboard.devices.table.protocol')}</TableHead>
                            <TableHead><span className="sr-only">{t('condoDashboard.devices.table.actions')}</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!devices ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell>
                                </TableRow>
                            ))
                        ) : devices.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">{t('condoDashboard.devices.noDevices')}</TableCell>
                            </TableRow>
                        ) : devices.map(device => (
                             <TableRow key={device.id}>
                                <TableCell className="font-medium">{device.name}</TableCell>
                                <TableCell>{device.device_type_name_translations[locale as 'es' | 'pt-BR'] || device.device_type_name_translations['pt-BR']}</TableCell>
                                <TableCell>{device.protocol_name || <span className="text-muted-foreground">{t('condoDashboard.devices.table.noProtocol')}</span>}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" disabled={isSubmitting}><MoreVertical className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => openManageDialog(device)}>
                                                <Settings className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem disabled><Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                                        <Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}
                                                     </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t('condoDashboard.devices.deleteConfirmation', { name: device.name })}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteDevice(device)} className={buttonVariants({variant: 'destructive'})}>
                                                            {t('common.delete')}
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

             <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                {selectedDevice && (
                    <ManageDeviceForm 
                        device={selectedDevice} 
                        protocols={protocols}
                        onSuccess={onFormSuccess}
                    />
                )}
             </Dialog>

             <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <CreateDeviceForm 
                    condoId={condoId}
                    deviceTypes={deviceTypes}
                    onSuccess={onFormSuccess}
                />
             </Dialog>
        </Card>
    );
}
