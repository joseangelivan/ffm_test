
"use client";

import React, { useState, useEffect, useCallback, useActionState } from 'react';
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
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import type { Device, DeviceCommunication } from '@/actions/devices';
import { getProtocols, type Protocol } from '@/actions/catalogs';
import { getDeviceCommunication, createOrUpdateDeviceCommunication } from '@/actions/devices';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { LoadingOverlay } from '../admin/admin-header';

function ManageDeviceForm({
    device,
    initialCommData,
    protocols,
    onSuccess,
    onCancel
}: {
    device: Device;
    initialCommData: DeviceCommunication | null;
    protocols: Protocol[];
    onSuccess: () => void;
    onCancel: () => void;
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
                            <Select name="protocol_id" defaultValue={initialCommData?.protocol_id || ''} required>
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
                            <Input id="physical_device_id" name="physical_device_id" defaultValue={initialCommData?.physical_device_id || ''} placeholder="ID físico o MAC address" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" asChild>
                           <DialogClose>{t('common.cancel')}</DialogClose>
                        </Button>
                         <Button type="submit">{t('common.save')}</Button>
                    </DialogFooter>
                </div>
            </form>
        </DialogContent>
    )
}


export default function ManageDevicesTab({ 
    initialDevices, 
    isLoading,
    condoId
}: { 
    initialDevices: Device[], 
    isLoading: boolean,
    condoId: string 
}) {
    const { t, locale } = useLocale();
    const { toast } = useToast();
    const [devices, setDevices] = useState(initialDevices);
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [deviceCommData, setDeviceCommData] = useState<DeviceCommunication | null>(null);
    const [isFormLoading, setIsFormLoading] = useState(false);


    useEffect(() => {
        async function fetchProtocols() {
            const data = await getProtocols();
            setProtocols(data);
        }
        fetchProtocols();
    }, []);

    const handleDeleteDevice = (deviceId: string) => {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.devices.toast.deviceDeleted'),
        });
    }
    
    const openManageDialog = async (device: Device) => {
        setSelectedDevice(device);
        setIsFormLoading(true);
        setIsManageDialogOpen(true);
        const commData = await getDeviceCommunication(device.id);
        setDeviceCommData(commData);
        setIsFormLoading(false);
    }
    
    const onFormSuccess = () => {
        setIsManageDialogOpen(false);
        setSelectedDevice(null);
        setDeviceCommData(null);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('condoDashboard.devices.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.devices.description')}</CardDescription>
                </div>
                 <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    {t('condoDashboard.devices.addDeviceButton')}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('condoDashboard.devices.table.name')}</TableHead>
                            <TableHead>{t('condoDashboard.devices.table.type')}</TableHead>
                            <TableHead>{t('condoDashboard.devices.table.status')}</TableHead>
                            <TableHead><span className="sr-only">{t('condoDashboard.devices.table.actions')}</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell>
                                </TableRow>
                            ))
                        ) : devices.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">{t('deviceTable.noDevices')}</TableCell>
                            </TableRow>
                        ) : devices.map(device => (
                             <TableRow key={device.id}>
                                <TableCell className="font-medium">{device.name}</TableCell>
                                <TableCell>{device.device_type_name_translations[locale as 'es' | 'pt-BR'] || device.device_type_name_translations['pt-BR']}</TableCell>
                                <TableCell>{t(`deviceStatus.offline`)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => openManageDialog(device)}>
                                                <Settings className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem><Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteDevice(device.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
             {isManageDialogOpen && selectedDevice && (
                <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                   {isFormLoading ? (
                        <DialogContent>
                             <div className="flex items-center justify-center h-40">
                                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        </DialogContent>
                   ) : (
                        <ManageDeviceForm 
                            device={selectedDevice} 
                            initialCommData={deviceCommData}
                            protocols={protocols}
                            onSuccess={onFormSuccess}
                            onCancel={() => setIsManageDialogOpen(false)}
                        />
                   )}
                </Dialog>
            )}
        </Card>
    );
}
