
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
  Undo,
  Redo,
  Loader,
} from 'lucide-react';
import { debounce } from 'lodash';

import { getGeometryFromShape, createShapeFromGeometry, restoreShapeToGeometry, EDIT_COLOR, SAVED_COLOR, DEFAULT_COLOR, REFERENCE_COLOR } from '../condo-map-tab';
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

export type DrawingMode = 'polygon' | 'rectangle' | 'circle';

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
    isEditingEnabled: boolean;
    setIsEditingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    showAllGeofences: boolean;
    setShowAllGeofences: React.Dispatch<React.SetStateAction<boolean>>;
    onSettingsClick: () => void;
    activeShapeRef: React.MutableRefObject<{ id: string, shape: google.maps.MVCObject, originalGeometry?: any } | null>;
    historyRef: React.MutableRefObject<any[]>;
    historyIndexRef: React.MutableRefObject<number>;
    updateHistoryButtons: () => void;
    mapShapes: Map<string, google.maps.MVCObject>;
    setupShapeListeners: (shape: google.maps.MVCObject) => void;
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
    isEditingEnabled,
    setIsEditingEnabled,
    showAllGeofences,
    setShowAllGeofences,
    onSettingsClick,
    activeShapeRef,
    historyRef,
    historyIndexRef,
    updateHistoryButtons,
    mapShapes,
    setupShapeListeners,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    const drawingCompleteListener = useRef<google.maps.MapsEventListener | null>(null);
    const [currentGeofenceName, setCurrentGeofenceName] = useState('');
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [isSettingDefault, startSettingDefaultTransition] = useTransition();
    const [isShapeDrawn, setIsShapeDrawn] = useState(false);


    const isActionActive = mode === 'editing';
    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
    
    const resetActionStates = useCallback(() => {
        if (activeShapeRef.current) {
            const { id, shape, originalGeometry } = activeShapeRef.current;
            if (id.startsWith('new-shape-')) {
                (shape as any).setMap(null);
            } else {
                (shape as any).setOptions({ editable: false, draggable: false });
                if (originalGeometry) {
                  restoreShapeToGeometry(shape, originalGeometry);
                }
            }
            activeShapeRef.current = null;
        }
        
        if (drawingManager) drawingManager.setDrawingMode(null);
        setMode('view');
        historyRef.current = [];
        historyIndexRef.current = -1;
        updateHistoryButtons();
        setCurrentGeofenceName('');
        setIsShapeDrawn(false);
    }, [drawingManager, setMode, activeShapeRef, historyRef, historyIndexRef, updateHistoryButtons]);


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
        if (activeShapeRef.current && activeShapeRef.current.id.startsWith('new-shape-')) {
            (activeShapeRef.current.shape as any).setMap(null);
        }
        
        setMode('editing');
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
        
        historyRef.current = [getGeometryFromShape(newShape)];
        historyIndexRef.current = 0;
        updateHistoryButtons();
        setupShapeListeners(newShape);
        setIsShapeDrawn(true);


    }, [drawingManager, activeShapeRef, historyRef, historyIndexRef, updateHistoryButtons, setupShapeListeners]);


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
        if (!selectedGeofenceId || !mapShapes) return;
        const shapeToEdit = mapShapes.get(selectedGeofenceId);
        const geofenceData = geofences.find(g => g.id === selectedGeofenceId);

        if (!shapeToEdit || !geofenceData) return;
        
        const originalGeometry = getGeometryFromShape(shapeToEdit);
        activeShapeRef.current = { id: selectedGeofenceId, shape: shapeToEdit, originalGeometry };
        
        setMode('editing');
        
        historyRef.current = [originalGeometry];
        historyIndexRef.current = 0;
        updateHistoryButtons();
        setIsShapeDrawn(true);
        
        setCurrentGeofenceName(geofenceData.name);
    }


    const handleDelete = () => {
        if (!selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')) return;
        const idToDelete = selectedGeofenceId;
        
        startDeletingTransition(async () => {
            const result = await deleteGeofence(idToDelete);
            
            if (result?.success) {
                toast({ title: t('toast.successTitle'), description: t('condoDashboard.map.toast.geofenceDeleted')});
                
                const shapeToRemove = mapShapes.get(idToDelete);
                if (shapeToRemove) {
                    (shapeToRemove as any).setMap(null);
                }
                mapShapes.delete(idToDelete);
                
                await onDataNeedsRefresh();

            } else if (result) {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
            } else {
                toast({ title: t('toast.errorTitle'), description: t('toast.adminLogin.serverError'), variant: "destructive" });
            }
        });
    }

    const handleSaveGeofence = () => {
        startSavingTransition(async () => {
            if (!activeShapeRef.current) {
                toast({ title: "Error", description: "No active shape found to save. Please try again.", variant: "destructive"});
                resetActionStates();
                return;
            }

            const { id, shape } = activeShapeRef.current;
            
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
                activeShapeRef.current = null; // Important: Clear ref before refresh
                await onDataNeedsRefresh(newSelectedId);
                resetActionStates();
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

    const handleEditingEnabledChange = (checked: boolean) => {
        setIsEditingEnabled(checked);
        if (!checked) {
            resetActionStates();
            setSelectedGeofenceId(defaultGeofenceId);
            setShowAllGeofences(false);
        } else {
            if (geofences.length > 0) {
                 setSelectedGeofenceId(defaultGeofenceId);
            }
        }
    };
    
    const isBusy = isSaving || isDeleting || isSettingDefault;

    return (
        <div className="space-y-4 pt-2 border-t">
            <div className="flex flex-col gap-4">
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="default-geofence">{t('condoDashboard.map.geofence.defaultLabel')}</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="view-all" disabled={!isEditingEnabled || isActionActive} checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)}/>
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
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="enable-editing" checked={isEditingEnabled} onCheckedChange={(checked) => handleEditingEnabledChange(!!checked)}/>
                        <label htmlFor="enable-editing" className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t('condoDashboard.map.geofence.editMode')}
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <fieldset disabled={!isEditingEnabled || isBusy} className="space-y-4 disabled:opacity-50">
                            <div className="flex items-center gap-2">
                                <Select value={selectedGeofenceId || ''} onValueChange={id => { if(!isActionActive) setSelectedGeofenceId(id) }} disabled={isActionActive || isBusy}>
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
                                                <Button variant="ghost" size="icon" onClick={handleStartEdit} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-') || isBusy}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.edit')}</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-') || isBusy}>
                                                    {isDeleting ? <Loader className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive"/>}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.delete')}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        
                        
                            {mode === 'editing' ? (
                                <div className='space-y-4 p-4 border border-green-300 rounded-md bg-green-50/30'>
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
                                    <Button onClick={handleStartDraw} variant="outline" className="flex-1" disabled={isActionActive || isBusy}>
                                        <PencilRuler className="mr-2 h-4 w-4"/>
                                        {t('condoDashboard.map.geofence.draw')}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-40 justify-between" disabled={isActionActive || isBusy}>
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
