
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';

import { getGeometryFromShape, createShapeFromGeometry, EDIT_COLOR } from '../condo-map-tab';
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

export type DrawingMode = 'polygon' | 'rectangle' | 'circle';

type GeofenceControlsProps = {
    condoId: string;
    geofences: DbGeofence[];
    onDataNeedsRefresh: (newSelectedId?: string) => void;
    selectedGeofenceId: string | null;
    setSelectedGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    defaultGeofenceId: string | null;
    setDefaultGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    mode: 'view' | 'editing' | 'drawing';
    setMode: React.Dispatch<React.SetStateAction<'view' | 'editing' | 'drawing'>>;
    drawingManager: google.maps.drawing.DrawingManager | null;
    isEditingEnabled: boolean;
    setIsEditingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    showAllGeofences: boolean;
    setShowAllGeofences: React.Dispatch<React.SetStateAction<boolean>>;
    onSettingsClick: () => void;
    mapShapes: Map<string, google.maps.MVCObject>;
    setupListeners: (shape: google.maps.MVCObject, onShapeChanged: () => void) => void;
    clearListeners: () => void;
    historyRef: React.MutableRefObject<any[]>;
    historyIndexRef: React.MutableRefObject<number>;
    updateAndRecordHistory: (shape: google.maps.MVCObject) => void;
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
    mapShapes,
    setupListeners,
    clearListeners,
    historyRef,
    historyIndexRef,
    updateAndRecordHistory,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    const drawingCompleteListener = useRef<google.maps.MapsEventListener | null>(null);

    const [currentGeofenceName, setCurrentGeofenceName] = useState('');
    
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const isActionActive = mode === 'editing' || mode === 'drawing';
    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
    
    const resetActionStates = useCallback((revertChanges = true) => {
        if (revertChanges && selectedGeofenceId && historyRef.current.length > 0) {
            const originalGeometry = historyRef.current[0];
            const shapeToRevert = mapShapes.get(selectedGeofenceId);
            if (shapeToRevert) {
                const newShape = createShapeFromGeometry(originalGeometry);
                if (newShape) {
                    // This part is tricky as we should modify the existing shape instead of replacing
                    // For simplicity in revert, we might need a more complex state management
                }
            }
        }
        
        const shapeBeingEdited = selectedGeofenceId ? mapShapes.get(selectedGeofenceId) : null;
        if(shapeBeingEdited) {
            (shapeBeingEdited as any).setOptions({ editable: false, draggable: false });
        }

        if (drawingManager) drawingManager.setDrawingMode(null);
        setMode('view');
        historyRef.current = [];
        historyIndexRef.current = -1;
        setCanUndo(false);
        setCanRedo(false);
        clearListeners();
        setCurrentGeofenceName('');
    }, [drawingManager, setMode, clearListeners, selectedGeofenceId, mapShapes, historyRef, historyIndexRef]);
    

    const handleStartDraw = () => {
        resetActionStates();
        setMode('drawing');
        if (drawingManager) {
            drawingManager.setDrawingMode(drawingMode as any);
        }
    }
    
    const onOverlayComplete = useCallback((event: google.maps.drawing.OverlayCompleteEvent) => {
        if(drawingManager) drawingManager.setDrawingMode(null);
        const newShape = event.overlay;
        if(!newShape) return;

        (newShape as any).setOptions(EDIT_COLOR);
        
        // This is a new unsaved shape. We can handle it by setting a temporary ID
        const tempId = `new-shape-${Date.now()}`;
        mapShapes.set(tempId, newShape);
        setSelectedGeofenceId(tempId);
        
        setMode('editing');
        setCurrentGeofenceName(getNextGeofenceName());
        updateAndRecordHistory(newShape);
        setupListeners(newShape, () => updateAndRecordHistory(newShape));
        setCanUndo(false);
        setCanRedo(false);

    }, [drawingManager, setMode, mapShapes, setSelectedGeofenceId, setupListeners, updateAndRecordHistory, geofences, t]);


    useEffect(() => {
        if (mode === 'drawing' && drawingManager) {
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
    }, [mode, drawingManager, onOverlayComplete]);


    const handleStartEdit = () => {
        if (!selectedGeofenceId || !mapShapes) return;
        const shapeToEdit = mapShapes.get(selectedGeofenceId);
        const geofenceData = geofences.find(g => g.id === selectedGeofenceId);

        if (!shapeToEdit || !geofenceData) return;
        
        resetActionStates(false); 
        
        updateAndRecordHistory(shapeToEdit);
        setCanUndo(false);
        setCanRedo(false);
        setMode('editing');
        setCurrentGeofenceName(geofenceData.name);
    }


    const handleDelete = async () => {
        if (!selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')) return;
        const idToDelete = selectedGeofenceId;
        
        const result = await deleteGeofence(idToDelete);
        
        if (result && result.success) {
            resetActionStates();
            toast({ title: t('toast.successTitle'), description: t('condoDashboard.map.toast.geofenceDeleted')});
            onDataNeedsRefresh();

        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        } else {
            toast({ title: t('toast.errorTitle'), description: t('toast.adminLogin.serverError'), variant: "destructive" });
        }
    }

    const getNextGeofenceName = () => {
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
    }

    const handleSaveGeofence = async () => {
        if (!selectedGeofenceId) {
             toast({ title: "Error", description: "No active shape found to save. Please try again.", variant: "destructive"});
             resetActionStates();
             return;
        }

        const shapeToSave = mapShapes.get(selectedGeofenceId);
        if (!shapeToSave) {
            toast({ title: "Error", description: "No shape object found.", variant: "destructive"});
            return;
        }
        
        const geometryToSave = getGeometryFromShape(shapeToSave);
        if (!currentGeofenceName) {
            toast({ title: t('toast.errorTitle'), description: "El nombre de la geocerca es obligatorio.", variant: "destructive"});
            return;
        }
        
        let result: { success: boolean; message: string; data?: any; } | null = null;
        const isNewShape = selectedGeofenceId.startsWith('new-shape-');

        if (isNewShape) { 
             result = await createGeofence({
                condoId,
                name: currentGeofenceName,
                geometry: geometryToSave,
                isDefault: geofences.length === 0,
            });
        } else {
             result = await updateGeofence(selectedGeofenceId, { name: currentGeofenceName, geometry: geometryToSave });
        }


        if (result?.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            const newSelectedId = isNewShape ? result.data?.id : selectedGeofenceId;
            resetActionStates(false); 
            onDataNeedsRefresh(newSelectedId);
        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        }
    };
    
    const handleSetAsDefault = async () => {
        if (!selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')) return;
        const result = await setCondoDefaultGeofence(condoId, selectedGeofenceId);
        if (result.success) {
            setDefaultGeofenceId(selectedGeofenceId);
            toast({ title: t('condoDashboard.map.toast.defaultSet.title'), description: t('condoDashboard.map.toast.defaultSet.description')});
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        }
    }

    const handleEditingEnabledChange = (checked: boolean) => {
        setIsEditingEnabled(checked);
        if (!checked) {
            resetActionStates();
            setSelectedGeofenceId(defaultGeofenceId);
            setShowAllGeofences(false);
        }
    };
    
    const applyHistoryState = useCallback((geometry: any) => {
        if (!selectedGeofenceId) return;

        const shapeToUpdate = mapShapes.get(selectedGeofenceId);
        if (!shapeToUpdate) return;
    
        const map = (shapeToUpdate as any).getMap();
        (shapeToUpdate as any).setMap(null); // Remove old shape
    
        const newShape = createShapeFromGeometry(geometry); // Create new shape from history
        if (!newShape) return;
    
        (newShape as any).setOptions({
            map: map,
            ...EDIT_COLOR
        });
    
        setupListeners(newShape, () => updateAndRecordHistory(newShape));
    
        mapShapes.set(selectedGeofenceId, newShape);

    }, [selectedGeofenceId, mapShapes, setupListeners, updateAndRecordHistory]);
    
    
    const handleUndo = useCallback(() => {
        if (!canUndo) return;
        historyIndexRef.current--;
        const previousGeometry = historyRef.current[historyIndexRef.current];
        applyHistoryState(previousGeometry);
    }, [canUndo, historyIndexRef, historyRef, applyHistoryState]);
    
    const handleRedo = useCallback(() => {
        if (!canRedo) return;
        historyIndexRef.current++;
        const nextGeometry = historyRef.current[historyIndexRef.current];
        applyHistoryState(nextGeometry);
    }, [canRedo, historyIndexRef, historyRef, applyHistoryState]);

    useEffect(() => {
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }, [historyIndexRef, historyRef.current]);

    return (
        <div className="space-y-4 pt-2 border-t">
            {mode === 'editing' && (canUndo || canRedo) && (
                <div className="flex gap-1 justify-center">
                    <Button onClick={handleUndo} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canUndo}>
                        <Undo className="h-4 w-4"/>
                        {t('condoDashboard.map.undo')}
                    </Button>
                    <Button onClick={handleRedo} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canRedo}>
                        <Redo className="h-4 w-4"/>
                        {t('condoDashboard.map.redo')}
                    </Button>
                </div>
            )}
            <div className="flex flex-col gap-4">
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="default-geofence">{t('condoDashboard.map.geofence.defaultLabel')}</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="view-all" disabled={isEditingEnabled} checked={showAllGeofences} onCheckedChange={(checked) => setShowAllGeofences(!!checked)}/>
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

                <fieldset disabled={!isEditingEnabled} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Select value={selectedGeofenceId || ''} onValueChange={id => { if(!isActionActive) setSelectedGeofenceId(id) }} disabled={isActionActive}>
                                <SelectTrigger className={cn("flex-1", mode === 'editing' && !selectedGeofenceId?.startsWith('new-shape-') && "text-[#2980b9] border-[#2980b9] font-bold")}>
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
                                <Button variant="ghost" size="icon" onClick={handleSetAsDefault} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')}>
                                    <Star className={cn("h-4 w-4", defaultGeofenceId === selectedGeofenceId && "fill-orange-400 text-orange-500")} />
                                    <span className="sr-only">{t('condoDashboard.map.geofence.setAsDefault')}</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleStartEdit} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')}>
                                    <Edit className="h-4 w-4"/>
                                    <span className="sr-only">{t('common.edit')}</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isActionActive || !selectedGeofenceId || selectedGeofenceId.startsWith('new-shape-')}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                    <span className="sr-only">{t('common.delete')}</span>
                                </Button>
                            </div>
                        </div>
                    
                    <div className="flex items-center gap-2">
                         <Button onClick={handleStartDraw} variant="outline" className="flex-1">
                            <PencilRuler className="mr-2 h-4 w-4"/>
                            {t('condoDashboard.map.geofence.draw')}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-40 justify-between" disabled={isActionActive}>
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
                    
                        {mode === 'editing' && (
                            <div className='space-y-4 p-4 border border-blue-300 rounded-md bg-blue-50/30'>
                                <div className="space-y-2">
                                    <Label htmlFor="geofence-name">{t('adminDashboard.newCondoDialog.nameLabel')}</Label>
                                    <Input 
                                        id="geofence-name" 
                                        value={currentGeofenceName}
                                        onChange={(e) => setCurrentGeofenceName(e.target.value)}
                                        placeholder={t('condoDashboard.map.geofence.defaultName')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button onClick={() => resetActionStates(true)} variant="ghost">
                                        <X className="mr-2 h-4 w-4" /> {t('common.cancel')}
                                    </Button>
                                    <Button onClick={handleSaveGeofence}>
                                        <Save className="mr-2 h-4 w-4" /> {selectedGeofenceId?.startsWith('new-shape-') ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                    </Button>
                                </div>
                            </div>
                    )}
                </fieldset>
            </div>
        </div>
    );
}

    