

"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  PencilRuler,
  ChevronDown,
  Save,
  Star,
  Layers,
  Edit,
  Trash2,
  Settings,
  X,
  Loader,
} from 'lucide-react';

import { createShapeFromGeometry, restoreShapeToGeometry, getGeometryFromShape } from './condo-map-tab';
import { createGeofence, updateGeofence, deleteGeofence, setCondoDefaultGeofence } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingOverlay } from '@/components/admin/admin-header';

export type DrawingMode = 'polygon' | 'rectangle' | 'circle';

type ActiveShapeState = { id: string, shape: google.maps.MVCObject | null, originalGeometry?: any } | null;

type GeofenceControlsProps = {
    condoId: string;
    geofences: DbGeofence[];
    onDataNeedsRefresh: (newSelectedId?: string) => void;
    selectedGeofenceId: string | null;
    setSelectedGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    defaultGeofenceId: string | null;
    setDefaultGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    mode: 'view' | 'editing';
    setMode: React.Dispatch<React.SetStateAction<'view' | 'editing'>>;
    drawingManager: google.maps.drawing.DrawingManager | null;
    showAllGeofences: boolean;
    setShowAllGeofences: React.Dispatch<React.SetStateAction<boolean>>;
    onSettingsClick: () => void;
    activeShapeState: ActiveShapeState;
    setActiveShapeState: React.Dispatch<React.SetStateAction<ActiveShapeState>>;
    history: any[];
    setHistory: React.Dispatch<React.SetStateAction<any[]>>;
    historyIndex: number;
    setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
    mapRef: React.RefObject<google.maps.Map | null>;
}

export function GeofenceControls({
    condoId,
    geofences,
    onDataNeedsRefresh,
    selectedGeofenceId,
    setSelectedGeofenceId,
    defaultGeofenceId,
    setDefaultGeofenceId,
    mode,
    setMode,
    drawingManager,
    showAllGeofences,
    setShowAllGeofences,
    onSettingsClick,
    activeShapeState,
    setActiveShapeState,
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    mapRef,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [isSettingDefault, startSettingDefaultTransition] = useTransition();

    const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
    const [currentGeofenceName, setCurrentGeofenceName] = useState('');

    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const getNextGeofenceName = useCallback(() => {
        const baseName = t('condoDashboard.map.geofence.defaultName');
        const existingNumbers = geofences.map(g => {
            const match = g.name.match(new RegExp(`^${baseName}_(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        }).filter(n => n > 0).sort((a,b) => a-b);
        
        let nextNumber = 1;
        for (const num of existingNumbers) {
            if (num === nextNumber) {
                nextNumber++;
            } else {
                break;
            }
        }
        return `${baseName}_${String(nextNumber).padStart(2, '0')}`;
    }, [geofences, t]);

    const onOverlayComplete = useCallback((event: google.maps.drawing.OverlayCompleteEvent) => {
        if (!drawingManager) return;
        
        drawingManager.setDrawingMode(null);
    
        const newShape = event.overlay;
        if (!newShape) return;
        
        // The new shape should be managed by activeShapeState, not directly on the map
        event.overlay.setMap(null);

        setMode('editing');
        setCurrentGeofenceName(getNextGeofenceName());
        setActiveShapeState({ id: `new-shape-${Date.now()}`, shape: newShape, originalGeometry: null });
        const newGeometry = getGeometryFromShape(newShape);
        setHistory([newGeometry]);
        setHistoryIndex(0);
    }, [drawingManager, getNextGeofenceName, setActiveShapeState, setHistory, setHistoryIndex, setMode]);

    useEffect(() => {
        if (!drawingManager) return;

        const listener = google.maps.event.addListener(
            drawingManager, 'overlaycomplete', onOverlayComplete
        );

        return () => {
            google.maps.event.removeListener(listener);
        };
    }, [drawingManager, onOverlayComplete]);


    const cancelCurrentAction = useCallback(() => {
        if (activeShapeState) {
            const { shape } = activeShapeState;
            if (shape) {
                 // Deactivates the shape, which will be hidden by the main useEffect in parent
                shape.setMap(null);
            }
        }
        setActiveShapeState(null);
        
        if (drawingManager) {
            drawingManager.setDrawingMode(null);
        }
        
        setCurrentGeofenceName('');
        setHistory([]);
        setHistoryIndex(-1);
    }, [activeShapeState, drawingManager, setHistory, setHistoryIndex, setActiveShapeState]);
      
    const startEditingSelected = useCallback(() => {
        if (!selectedGeofenceId) return;
        const selectedGeofence = geofences.find(g => g.id === selectedGeofenceId);
        
        if (!selectedGeofence) return;
    
        cancelCurrentAction();
        const shapeToEdit = createShapeFromGeometry(selectedGeofence.geometry);
        const originalGeometry = getGeometryFromShape(shapeToEdit);
        
        setMode('editing');
        setActiveShapeState({ id: selectedGeofenceId, shape: shapeToEdit, originalGeometry });
        
        setHistory([originalGeometry]);
        setHistoryIndex(0);
    
        setCurrentGeofenceName(selectedGeofence.name);
    }, [selectedGeofenceId, geofences, cancelCurrentAction, setHistory, setHistoryIndex, setActiveShapeState, setMode]);
      
    const saveCurrentAction = useCallback(async () => {
        if (!activeShapeState?.shape) return;
        const { id, shape } = activeShapeState;
    
        const geometryToSave = getGeometryFromShape(shape);
        if (!currentGeofenceName) {
            toast({ title: t('toast.errorTitle'), description: "El nombre de la geocerca es obligatorio.", variant: "destructive" });
            return;
        }
        
        let result: { success: boolean; message: string; data?: any; } | null = null;
        const isNewShape = id.startsWith('new-shape-');
    
        if (isNewShape) { 
            result = await createGeofence({
                condoId: condoId, name: currentGeofenceName, geometry: geometryToSave, isDefault: geofences.length === 0,
            });
        } else {
            result = await updateGeofence(id, { name: currentGeofenceName, geometry: geometryToSave });
        }
    
        if (result?.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            const newSelectedId = isNewShape ? result.data?.id : id;
            cancelCurrentAction();
            await onDataNeedsRefresh(newSelectedId);
        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        }
    }, [condoId, currentGeofenceName, activeShapeState, geofences.length, onDataNeedsRefresh, cancelCurrentAction, t, toast]);

    const handleSaveGeofence = () => {
        startSavingTransition(async () => {
            await saveCurrentAction();
        });
    };

    const handleDelete = () => {
        if (!selectedGeofenceId) return;
        const idToDelete = selectedGeofenceId;
        
        startDeletingTransition(async () => {
            const result = await deleteGeofence(idToDelete);
            
            if (result?.success) {
                toast({ title: t('toast.successTitle'), description: t('condoDashboard.map.toast.geofenceDeleted')});
                await onDataNeedsRefresh();
            } else if (result) {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
            } else {
                toast({ title: t('toast.errorTitle'), description: t('toast.adminLogin.serverError'), variant: "destructive" });
            }
        });
    }
    
    const handleSetAsDefault = () => {
        if (!selectedGeofenceId) return;
        startSettingDefaultTransition(async () => {
            const result = await setCondoDefaultGeofence(condoId, selectedGeofenceId!);
            if (result.success) {
                setDefaultGeofenceId(selectedGeofenceId);
                toast({ title: t('condoDashboard.map.toast.defaultSet.title'), description: t('condoDashboard.map.toast.defaultSet.description')});
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
            }
        });
    }
    
    const isBusy = isSaving || isDeleting || isSettingDefault;

    return (
        <div className="space-y-4 pt-2 border-t">
            <div className="flex flex-col gap-4">
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="default-geofence">{t('condoDashboard.map.geofence.defaultLabel')}</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="view-all" checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)}/>
                            <label htmlFor="view-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t('condoDashboard.map.geofence.viewAll')}
                            </label>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                         <div className="relative flex-grow">
                            {defaultGeofenceId && (
                                <Star className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500 fill-orange-400" />
                            )}
                            <Input id="default-geofence" value={defaultGeofenceName} readOnly disabled className="pl-8 text-xs h-8"/>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={onSettingsClick}>
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Configuración de Vista del Mapa</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                 </div>
            </div>

            <div className="pt-4 border-t space-y-2">
                <div className="space-y-4">
                     <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="edit-mode" 
                            checked={mode === 'editing'} 
                            onCheckedChange={(checked) => {
                                if (!checked) cancelCurrentAction();
                                setMode(checked ? 'editing' : 'view');
                            }}
                        />
                        <label
                            htmlFor="edit-mode"
                            className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {t('adminDashboard.settingsGroups.catalogs.deviceTypes.editMode')}
                        </label>
                    </div>

                    <fieldset disabled={isBusy || mode === 'view'} className="space-y-4 disabled:opacity-50">
                            <div className="flex items-center gap-2">
                                <Select value={selectedGeofenceId || ''} onValueChange={setSelectedGeofenceId} disabled={!!activeShapeState || isBusy}>
                                    <SelectTrigger className={cn("flex-1", selectedGeofenceId && !selectedGeofenceId.startsWith('new-shape-') && "text-blue-600 border-blue-400 font-bold")}>
                                        <SelectValue placeholder={t('condoDashboard.map.geofence.selectPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {geofences.map(gf => (
                                            <SelectItem key={gf.id} value={gf.id}>
                                                <div className='flex items-center gap-2'>
                                                    {gf.id === defaultGeofenceId && <Star className="h-4 w-4 text-orange-500 fill-orange-400" />}
                                                    <span>{gf.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={!!activeShapeState || !selectedGeofenceId || isBusy || defaultGeofenceId === selectedGeofenceId} onClick={handleSetAsDefault}>
                                                    {isSettingDefault ? <Loader className="h-4 w-4 animate-spin"/> : <Star className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('condoDashboard.map.geofence.setAsDefault')}</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={startEditingSelected} disabled={!!activeShapeState || !selectedGeofenceId || isBusy}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.edit')}</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={!!activeShapeState || !selectedGeofenceId || isBusy}>
                                                    {isDeleting ? <Loader className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive"/>}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.delete')}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        
                        
                            {activeShapeState ? (
                                <div className='relative space-y-4 p-4 border border-blue-300 rounded-md bg-blue-50/30 dark:border-blue-700 dark:bg-blue-900/20'>
                                     {isSaving && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
                                    <div className="space-y-2">
                                        <Input 
                                            id="geofence-name" 
                                            value={currentGeofenceName}
                                            onChange={(e) => setCurrentGeofenceName(e.target.value)}
                                            placeholder={t('condoDashboard.map.geofence.defaultName')}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button onClick={cancelCurrentAction} variant="ghost" disabled={isSaving}>
                                            <X className="mr-2 h-4 w-4" /> {t('common.cancel')}
                                        </Button>
                                        <Button onClick={handleSaveGeofence} disabled={isSaving || !activeShapeState.shape}>
                                            {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            {activeShapeState?.id.startsWith('new-shape-') ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex items-center gap-2">
                                    <Button onClick={() => {
                                        if (drawingManager) {
                                            drawingManager.setMap(mapRef.current);
                                            drawingManager.setDrawingMode(drawingMode as any);
                                        }
                                    }} variant="outline" className="flex-1" disabled={!!activeShapeState || isBusy}>
                                        <PencilRuler className="mr-2 h-4 w-4"/>
                                        {t('condoDashboard.map.geofence.draw')}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-40 justify-between" disabled={!!activeShapeState || isBusy}>
                                                <span>
                                                    {drawingMode === 'polygon' && t('condoDashboard.map.shapes.polygon')}
                                                    {drawingMode === 'rectangle' && t('condoDashboard.map.shapes.rectangle')}
                                                    {drawingMode === 'circle' && t('condoDashboard.map.shapes.circle')}
                                                </span>
                                                <ChevronDown className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => setDrawingMode('polygon')}>{t('condoDashboard.map.shapes.polygon')}</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setDrawingMode('rectangle')}>{t('condoDashboard.map.shapes.rectangle')}</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setDrawingMode('circle')}>{t('condoDashboard.map.shapes.circle')}</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                    </fieldset>
                </div>
            </div>
        </div>
    );
}
