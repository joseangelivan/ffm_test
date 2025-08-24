

"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
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

import { restoreShapeToGeometry, getGeometryFromShape } from './condo-map-tab';
import { createGeofence, updateGeofence, deleteGeofence, setCondoDefaultGeofence } from '@/actions/maps';
import type { Geofence as DbGeofence } from '@/actions/maps';
import { isEqual } from 'lodash';

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

type GeofenceControlsProps = {
    condoId: string;
    geofences: DbGeofence[];
    mapShapesRef: React.MutableRefObject<Map<string, google.maps.MVCObject>>;
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
    activeShapeRef: React.MutableRefObject<{ id: string, shape: google.maps.MVCObject | null, originalGeometry?: any } | null>;
    onHistoryUpdate: (shape: google.maps.MVCObject | null, isFirstChange?: boolean) => void;
}

export function GeofenceControls({
    condoId,
    geofences,
    mapShapesRef,
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
    activeShapeRef,
    onHistoryUpdate,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    const drawingCompleteListener = useRef<google.maps.MapsEventListener | null>(null);
    const [currentGeofenceName, setCurrentGeofenceName] = useState('');
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [isSettingDefault, startSettingDefaultTransition] = useTransition();
    const [isShapeDrawn, setIsShapeDrawn] = useState(false);


    const isActionActive = !!activeShapeRef.current;
    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
    
    const resetActionStates = useCallback(() => {
        if (activeShapeRef.current) {
            const { shape, id, originalGeometry } = activeShapeRef.current;
            if (shape) {
                google.maps.event.clearInstanceListeners(shape);
                if (id.startsWith('new-shape-')) {
                    shape.setMap(null); // Completely remove new shapes from the map
                } else if (originalGeometry) {
                    // Restore original geometry from before editing
                    restoreShapeToGeometry(shape, originalGeometry);
                    shape.setOptions({ editable: false, draggable: false });
                }
            }
             activeShapeRef.current = null;
        }
        
        if (drawingManager) {
            drawingManager.setDrawingMode(null);
        }

        setCurrentGeofenceName('');
        setIsShapeDrawn(false);
        onHistoryUpdate(null);
    }, [drawingManager, activeShapeRef, onHistoryUpdate]);


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

    const handleStartDraw = () => {
        resetActionStates();
        
        activeShapeRef.current = { id: `new-shape-pending-${Date.now()}`, shape: null };
        
        setCurrentGeofenceName(getNextGeofenceName());
        setIsShapeDrawn(false);
        
        if (drawingManager) {
            drawingManager.setDrawingMode(drawingMode as any);
        }
    }

    const onOverlayComplete = useCallback((event: google.maps.drawing.OverlayCompleteEvent) => {
        if(drawingManager) drawingManager.setDrawingMode(null);
        const newShape = event.overlay;
        if(!newShape) return;
        
        const tempId = `new-shape-${Date.now()}`;
        activeShapeRef.current = { id: tempId, shape: newShape };
        onHistoryUpdate(newShape, true);
        setIsShapeDrawn(true);

    }, [drawingManager, activeShapeRef, onHistoryUpdate]);


    useEffect(() => {
        if (drawingManager) {
             if (drawingCompleteListener.current) {
                drawingCompleteListener.current.remove();
             }
            drawingCompleteListener.current = google.maps.event.addListener(
                drawingManager,
                'overlaycomplete',
                onOverlayComplete
            );
        }
        return () => {
             if (drawingCompleteListener.current) {
                google.maps.event.removeListener(drawingCompleteListener.current);
             }
        }
    }, [drawingManager, onOverlayComplete]);


    const handleStartEdit = () => {
        if (!selectedGeofenceId) return;
        
        const shapeToEdit = mapShapesRef.current.get(selectedGeofenceId);
        const geofenceData = geofences.find(g => g.id === selectedGeofenceId);

        if (!shapeToEdit || !geofenceData) return;
        
        resetActionStates();
        const originalGeometry = getGeometryFromShape(shapeToEdit);
        
        activeShapeRef.current = { id: selectedGeofenceId, shape: shapeToEdit, originalGeometry };
        onHistoryUpdate(shapeToEdit, true);
        setIsShapeDrawn(true);
        
        setCurrentGeofenceName(geofenceData.name);
    }


    const handleDelete = () => {
        if (!selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')) return;
        const idToDelete = selectedGeofenceId;
        
        startDeletingTransition(async () => {
            const result = await deleteGeofence(idToDelete);
            
            if (result?.success) {
                // Remove shape from the map and the ref
                const shapeToRemove = mapShapesRef.current.get(idToDelete);
                if (shapeToRemove) {
                    shapeToRemove.setMap(null);
                    mapShapesRef.current.delete(idToDelete);
                }

                toast({ title: t('toast.successTitle'), description: t('condoDashboard.map.toast.geofenceDeleted')});
                await onDataNeedsRefresh();
            } else if (result) {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
            } else {
                toast({ title: t('toast.errorTitle'), description: t('toast.adminLogin.serverError'), variant: "destructive" });
            }
        });
    }

    const handleSaveGeofence = () => {
        if (!activeShapeRef.current || !activeShapeRef.current.shape) {
            toast({ title: "Error", description: "No active shape found to save. Please try again.", variant: "destructive"});
            resetActionStates();
            return;
        }

        startSavingTransition(async () => {
            const { id, shape } = activeShapeRef.current!;
            shape.setOptions({ editable: false, draggable: false });
            
            const geometryToSave = getGeometryFromShape(shape);
            if (!currentGeofenceName) {
                toast({ title: t('toast.errorTitle'), description: "El nombre de la geocerca es obligatorio.", variant: "destructive"});
                return;
            }
            
            let result: { success: boolean; message: string; data?: any; } | null = null;
            const isNewShape = id.startsWith('new-shape-');

            if (isNewShape) { 
                result = await createGeofence({
                    condoId,
                    name: currentGeofenceName,
                    geometry: geometryToSave,
                    isDefault: geofences.length === 0,
                });
            } else {
                result = await updateGeofence(id, { name: currentGeofenceName, geometry: geometryToSave });
            }


            if (result?.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                const newSelectedId = isNewShape ? result.data?.id : id;
                if(isNewShape) {
                    shape.setMap(null); // remove temporary new shape
                }
                resetActionStates();
                await onDataNeedsRefresh(newSelectedId);
            } else if (result) {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
            }
        });
    };
    
    const handleSetAsDefault = () => {
        if (!selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')) return;
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
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onSettingsClick}>
                            <Settings className="h-4 w-4" />
                        </Button>
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
                                if (!checked) resetActionStates();
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

                    <fieldset disabled={isBusy} className="space-y-4 disabled:opacity-50">
                            <div className="flex items-center gap-2">
                                <Select value={selectedGeofenceId || ''} onValueChange={id => { if(!isActionActive) setSelectedGeofenceId(id) }} disabled={isActionActive || isBusy || mode === 'view'}>
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
                                                <Button variant="ghost" size="icon" disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-') || isBusy || defaultGeofenceId === selectedGeofenceId} onClick={handleSetAsDefault}>
                                                    {isSettingDefault ? <Loader className="h-4 w-4 animate-spin"/> : <Star className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('condoDashboard.map.geofence.setAsDefault')}</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleStartEdit} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-') || isBusy || mode === 'view'}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.edit')}</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-') || isBusy || mode === 'view'}>
                                                    {isDeleting ? <Loader className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive"/>}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.delete')}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        
                        
                            {isActionActive ? (
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
                                        <Button onClick={() => resetActionStates()} variant="ghost" disabled={isSaving}>
                                            <X className="mr-2 h-4 w-4" /> {t('common.cancel')}
                                        </Button>
                                        <Button onClick={handleSaveGeofence} disabled={isSaving || !isShapeDrawn}>
                                            {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            {activeShapeRef.current?.id.startsWith('new-shape-') ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex items-center gap-2">
                                    <Button onClick={handleStartDraw} variant="outline" className="flex-1" disabled={isActionActive || isBusy || mode === 'view'}>
                                        <PencilRuler className="mr-2 h-4 w-4"/>
                                        {t('condoDashboard.map.geofence.draw')}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-40 justify-between" disabled={isActionActive || isBusy || mode === 'view'}>
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
