
"use client";

import React, { useState } from 'react';
import {
  Trash2,
  PlusCircle,
  MoreVertical,
  Settings,
  Edit,
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import type { Device } from '@/actions/devices';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


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

    const handleDeleteDevice = (deviceId: string) => {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.devices.toast.deviceDeleted'),
        });
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.devices.toast.tokenCopied'),
        });
    };

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
                                <TableCell>{device.device_type_name_translations[locale] || device.device_type_name_translations['pt-BR']}</TableCell>
                                <TableCell>{t(`deviceStatus.offline`)}</TableCell>
                                <TableCell className="text-right">
                                    <Dialog>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <Settings className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
                                                    </DropdownMenuItem>
                                                </DialogTrigger>
                                                <DropdownMenuItem><Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteDevice(device.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t('condoDashboard.devices.manageDialog.title', { name: device.name })}</DialogTitle>
                                                <DialogDescription>{t('condoDashboard.devices.manageDialog.description')}</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-6 py-4">
                                                <div>
                                                    <h3 className="font-semibold mb-2">{t('condoDashboard.devices.manageDialog.serverConfigTitle')}</h3>
                                                     <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`protocol-${device.id}`}>{t('condoDashboard.devices.manageDialog.protocol')}</Label>
                                                            <Select defaultValue="websocket">
                                                                <SelectTrigger id={`protocol-${device.id}`}>
                                                                    <SelectValue placeholder={t('condoDashboard.devices.manageDialog.selectProtocol')} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="websocket">Websocket</SelectItem>
                                                                    <SelectItem value="mqtt">MQTT</SelectItem>
                                                                    <SelectItem value="coap">CoAP</SelectItem>
                                                                    <SelectItem value="http">HTTP</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`server-url-${device.id}`}>{t('condoDashboard.devices.manageDialog.serverUrl')}</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input id={`server-url-${device.id}`} value="wss://your-followforme-server.com/ws" readOnly />
                                                                <Button variant="outline" size="icon" onClick={() => copyToClipboard('wss://your-followforme-server.com/ws')}><Copy className="h-4 w-4" /></Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                 <div>
                                                    <h3 className="font-semibold mb-2">{t('condoDashboard.devices.manageDialog.deviceTokenTitle')}</h3>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`device-token-${device.id}`}>{t('condoDashboard.devices.manageDialog.deviceToken')}</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input id={`device-token-${device.id}`} value={device.token} readOnly />
                                                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(device.token)}><Copy className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" asChild>
                                                    <DialogTrigger>{t('common.close')}</DialogTrigger>
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
