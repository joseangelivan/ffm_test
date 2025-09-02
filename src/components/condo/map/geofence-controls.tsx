
"use client";

import React, { useState, useEffect } from 'react';
import {
  PenSquare,
  PlusCircle,
  Save,
  XCircle,
  Settings,
  Star,
  Trash2,
  Eye,
  EyeOff,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

import type { Geofence as DbGeofence } from '@/actions/maps';
import { 
    setCondoDefaultGeofence,
    createGeofence,
    updateGeofence,
    deleteGeofence,
} from '@/actions/maps';

const CreateEditGeofenceDialog = ({ condoId, geofence, onSuccess, onOpenChange, isOpen, activeShapeState }: { condoId: string, geofence?: DbGeofence | null, onSuccess: (newId?: string) => void, onOpenChange: (isOpen: boolean) => void, isOpen: boolean, activeShapeState: any }) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const [name, setName] = useState(geofence?.name || '');
    const [isDefault, setIsDefault] = useState(geofence?.is_default || false);
    const [isPending, startTransition] = React.useTransition();

    useEffect(() => {
        if(isOpen) {
            setName(geofence?.name || '');
            setIsDefault(geofence?.is_default || false);
        }
    }, [isOpen, geofence]);

    const handleSubmit = () => {
        startTransition(async () => {
            const geometry = activeShapeState?.shape ? {} : (geofence?.geometry || {}); // Placeholder for geometry
            
            if (!Object.keys(geometry).length) {
                toast({ title: t('toast.errorTitle'), description: "No shape drawn.", variant: 'destructive' });
                return;
            }
            
            let result;
            if (geofence) {
                result = await updateGeofence(geofence.id, { name, geometry });
            } else {
                result = await createGeofence({ condoId, name, geometry, isDefault });
            }

            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onSuccess(result.data?.id);
                onOpenChange(false);
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{geofence ? t('common.edit') : t('common.create')} {t('condoDashboard.map.modules.geofence')}</DialogTitle>
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={!name || isPending}>{t('common.save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const getGeofenceName = (gf: DbGeofence, isDefault: boolean, t: (key: string) => string) => {
  return `${gf.name}${isDefault ? ` (${t('common.default')})` : ''}`;
};


export const GeofenceControls = ({
    condoId,
    geofences,
    onDataNeedsRefresh,
    onShapeDrawn,
    selectedGeofenceId,
    setSelectedGeofenceId,
    defaultGeofenceId,
    mode,
    setMode,
    drawingManager,
    showAllGeofences,
    setShowAllGeofences,
    activeShapeState,
    setActiveShapeState,
    setUndoStack,
    setRedoStack,
    mapShapesRef
}: any) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const [shapeType, setShapeType] = useState('Polygon');
    const [isCreateGeofenceDialogOpen, setIsCreateGeofenceDialogOpen] = useState(false);
    const [isEditGeofenceDialogOpen, setIsEditGeofenceDialogOpen] = useState(false);
    const [isPending, startTransition] = React.useTransition();

    const handleSetDefault = (geofenceId: string) => {
        startTransition(async () => {
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
      startTransition(async () => {
          const result = await deleteGeofence(geofenceId);
          if (result.success) {
              toast({ title: t('toast.successTitle'), description: result.message });
              onDataNeedsRefresh();
          } else {
              toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
          }
      });
  };

    const handleDraw = () => {
        // Placeholder for OpenLayers drawing logic
        onShapeDrawn({}); // Mock drawing a shape
    };
    
    const handleSave = () => {
        if (!activeShapeState?.id) return;
        if(activeShapeState.id.startsWith('new-shape')) {
             setIsCreateGeofenceDialogOpen(true);
        } else {
             setIsEditGeofenceDialogOpen(true);
        }
    }
    
    const handleCancel = () => {
        setActiveShapeState(null);
        setUndoStack([]);
        setRedoStack([]);
        setMode('view');
    };

    const editingGeofence = geofences.find((g: DbGeofence) => g.id === activeShapeState?.id);

    return (
        <>
            <div className="space-y-4 pt-2 border-t mt-4 flex-grow flex flex-col">
                 <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                      <Label htmlFor='default-geofence-display'>{t('condoDashboard.map.geofence.defaultLabel')}</Label>
                      <Input id='default-geofence-display' value={geofences.find((g: DbGeofence) => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none')} readOnly />
                  </div>
                  <div className="flex items-center space-x-2 pb-2">
                      <Checkbox id="show-all" checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)} />
                      <Label htmlFor="show-all">{t('condoDashboard.map.geofence.viewAll')}</Label>
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
                            {geofences.map((gf: DbGeofence) => (
                                <SelectItem key={gf.id} value={gf.id}>{getGeofenceName(gf, gf.id === defaultGeofenceId, t)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" disabled={isPending} onClick={() => { setMode('editing'); setActiveShapeState(null); }}>
                        <PlusCircle className="mr-2 h-4 w-4"/>{t('common.create')}
                    </Button>
                    <Button variant="outline" disabled={!selectedGeofenceId || isPending} onClick={() => {
                        setMode('editing');
                        setActiveShapeState({ id: selectedGeofenceId, shape: {}, originalGeometry: {} });
                        setUndoStack([{}]);
                        setRedoStack([]);
                    }}>
                        <Edit className="mr-2 h-4 w-4"/>{t('common.edit')}
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={!selectedGeofenceId || isPending}>
                                <Trash2 className="mr-2 h-4 w-4"/>{t('common.delete')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('condoDashboard.users.deleteConfirmation', {name: geofences.find((g: DbGeofence) => g.id === selectedGeofenceId)?.name || ''})}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(selectedGeofenceId!)}>{t('common.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="secondary" onClick={() => handleSetDefault(selectedGeofenceId!)} disabled={!selectedGeofenceId || selectedGeofenceId === defaultGeofenceId || isPending}>
                        <Star className="mr-2 h-4 w-4"/>{t('condoDashboard.map.geofence.setAsDefault')}
                    </Button>
                </div>
                
                 <fieldset className="border rounded-md p-4 pt-2 space-y-4 mt-auto">
                    <legend className="-ml-1 px-1 text-sm font-medium flex items-center">
                       <Checkbox id="enable-editing" checked={mode === 'editing'} onCheckedChange={(checked) => setMode(checked ? 'editing' : 'view')} />
                       <Label htmlFor="enable-editing" className="ml-2 font-semibold text-foreground">{t('adminDashboard.settingsGroups.catalogs.deviceTypes.editMode')}</Label>
                    </legend>
                    {mode === 'editing' && (
                        <div className="space-y-4 animate-in fade-in-50">
                            <Select value={shapeType} onValueChange={(v) => setShapeType(v as any)} disabled={!!activeShapeState}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='Polygon'>{t('condoDashboard.map.shapes.polygon')}</SelectItem>
                                    <SelectItem value='Rectangle'>{t('condoDashboard.map.shapes.rectangle')}</SelectItem>
                                    <SelectItem value='Circle'>{t('condoDashboard.map.shapes.circle')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="grid grid-cols-1 gap-2">
                                 {!activeShapeState ? (
                                    <Button onClick={handleDraw}><PenSquare className="h-4 w-4 mr-2" />{t('condoDashboard.map.geofence.draw')} {shapeType}</Button>
                                 ) : (
                                    <>
                                        <Button onClick={handleSave}><Save className="h-4 w-4 mr-2"/> {t('condoDashboard.map.geofence.saveButton')}</Button>
                                        <Button onClick={handleCancel} variant="ghost"><XCircle className="h-4 w-4 mr-2"/> {t('common.cancel')}</Button>
                                    </>
                                 )}
                            </div>
                        </div>
                    )}
                </fieldset>
            </div>
            
            <CreateEditGeofenceDialog
                condoId={condoId}
                isOpen={isCreateGeofenceDialogOpen}
                onOpenChange={setIsCreateGeofenceDialogOpen}
                onSuccess={(newId) => { onDataNeedsRefresh(newId); setMode('view'); setActiveShapeState(null); }}
                activeShapeState={activeShapeState}
            />
             <CreateEditGeofenceDialog
                condoId={condoId}
                geofence={editingGeofence}
                isOpen={isEditGeofenceDialogOpen}
                onOpenChange={setIsEditGeofenceDialogOpen}
                onSuccess={() => { onDataNeedsRefresh(activeShapeState?.id); setMode('view'); setActiveShapeState(null); }}
                activeShapeState={activeShapeState}
            />
        </>
    );
};
