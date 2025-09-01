
"use client";

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import {
    PlusCircle,
    Edit,
    Trash2,
    Save,
    Star,
    Loader,
    XCircle,
    Eye,
    EyeOff,
} from 'lucide-react';
import {
    Dialog,
    DialogClose,
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  setCondoDefaultGeofence,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  type Geofence,
} from '@/actions/maps';
import { cn } from '@/lib/utils';

export function GeofenceControls({
    condoId,
    dbGeofences,
    onDataNeedsRefresh,
}: {
    condoId: string;
    dbGeofences: Geofence[];
    onDataNeedsRefresh: (newSelectedId?: string) => void;
}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [mode, setMode] = useState<'view' | 'editing'>('view');
    const [shapeType, setShapeType] = useState<'polygon' | 'rectangle' | 'circle'>('polygon');
    const [showAllGeofences, setShowAllGeofences] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [isSettingDefault, startSettingDefault] = useTransition();
    
    // This state would hold the currently selected geofence from the list
    const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(dbGeofences.find(g => g.is_default)?.id || null);
    
    const handleSetDefault = (geofenceId: string) => {
        startSettingDefault(async () => {
            const result = await setCondoDefaultGeofence(condoId, geofenceId);
            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onDataNeedsRefresh(geofenceId);
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };

    const handleDelete = (geofenceId: string) => {
        startDeleting(async () => {
            const result = await deleteGeofence(geofenceId);
            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onDataNeedsRefresh();
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    const isBusy = isSaving || isDeleting || isSettingDefault;

    return (
        <div className="space-y-4 pt-2 border-t mt-4 flex-grow flex flex-col">
            <div className="flex justify-between items-center">
                 <h3 className="text-base font-semibold">{t('condoDashboard.map.modules.geofence')}</h3>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="show-all" checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)} />
                    <Label htmlFor="show-all" className="text-xs">{t('condoDashboard.map.geofence.viewAll')}</Label>
                </div>
            </div>
            
            <div className="space-y-2">
                <Label>{t('condoDashboard.map.geofence.selectPlaceholder')}</Label>
                <Select
                    value={selectedGeofenceId || ''}
                    onValueChange={setSelectedGeofenceId}
                    disabled={showAllGeofences}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('condoDashboard.map.geofence.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {dbGeofences.map(gf => (
                             <SelectItem key={gf.id} value={gf.id}>{gf.name}{gf.is_default ? ` (${t('common.default')})` : ''}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
             <div className="flex-grow space-y-4">
                 <div className="grid grid-cols-2 gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" disabled={isBusy}><PlusCircle className="mr-2"/>{t('common.create')}</Button>
                        </DialogTrigger>
                         <CreateEditGeofenceDialog condoId={condoId} onSuccess={onDataNeedsRefresh} />
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={!selectedGeofenceId || isBusy}><Edit className="mr-2"/>{t('common.edit')}</Button>
                        </DialogTrigger>
                        <CreateEditGeofenceDialog condoId={condoId} geofence={dbGeofences.find(g => g.id === selectedGeofenceId)} onSuccess={onDataNeedsRefresh} />
                    </Dialog>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" disabled={!selectedGeofenceId || isBusy}>
                                 <Trash2 className="mr-2"/>{t('common.delete')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('condoDashboard.users.deleteConfirmation', {name: dbGeofences.find(g => g.id === selectedGeofenceId)?.name || ''})}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(selectedGeofenceId!)}>{t('common.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="secondary" onClick={() => handleSetDefault(selectedGeofenceId!)} disabled={!selectedGeofenceId || dbGeofences.find(g => g.id === selectedGeofenceId)?.is_default || isBusy}>
                         <Star className="mr-2"/>{t('condoDashboard.map.geofence.setAsDefault')}
                    </Button>
                </div>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">{t('condoDashboard.map.wipDescription')}</p>
            </div>
        </div>
    );
}


const CreateEditGeofenceDialog = ({ condoId, geofence, onSuccess }: { condoId: string, geofence?: Geofence, onSuccess: (newId?: string) => void }) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const [name, setName] = useState(geofence?.name || '');
    const [isDefault, setIsDefault] = useState(geofence?.is_default || false);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = () => {
        startTransition(async () => {
            const geometry = {}; // Placeholder for OpenLayers drawn geometry
            let result;
            if (geofence) {
                // Update logic
                result = await updateGeofence(geofence.id, { name, geometry });
            } else {
                // Create logic
                result = await createGeofence({ condoId, name, geometry, isDefault });
            }

            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onSuccess(result.data?.id);
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <DialogContent>
             <div className={cn('relative', isPending && 'opacity-50 pointer-events-none')}>
                {isPending && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50"><Loader className="animate-spin" /></div>}
                <DialogHeader>
                    <DialogTitle>{geofence ? t('common.edit') : t('common.create')} {t('condoDashboard.map.modules.geofence')}</DialogTitle>
                    <DialogDescription>{t('condoDashboard.users.createDialog.description')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('addDeviceDialog.nameLabel')}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('condoDashboard.map.geofence.defaultName')} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="is-default" checked={isDefault} onCheckedChange={(checked) => setIsDefault(!!checked)} />
                        <Label htmlFor="is-default">{t('condoDashboard.map.geofence.setAsDefault')}</Label>
                    </div>
                     <div className="pt-4 border-t text-center text-muted-foreground text-sm">
                        <p>{t('condoDashboard.map.wipDescription')}</p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={!name || isPending}>{t('common.save')}</Button>
                </DialogFooter>
            </div>
        </DialogContent>
    );
};
