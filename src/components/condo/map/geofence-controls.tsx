

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
    mapShapes: Map<string, google.maps.MVCObject> | null;
    onDataNeedsRefresh: (newSelectedId?: string) => void;
    selectedGeofenceId: string | null;
    setSelectedGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    defaultGeofenceId: string | null;
    setDefaultGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    mode: 'view' | 'editing' | 'drawing';
    setMode: React.Dispatch<React.SetStateAction<'view' | 'editing' | 'drawing'>>;
    drawingManager: google.maps.drawing.DrawingManager | null;
    updateHistory: (geometry: any) => void;
    historyRef: React.MutableRefObject<any[]>;
    historyIndexRef: React.MutableRefObject<number>;
    setCanUndo: React.Dispatch<React.SetStateAction<boolean>>;
    setCanRedo: React.Dispatch<React.SetStateAction<boolean>>;
    clearListeners: () => void;
    drawingMode: DrawingMode;
    setDrawingMode: React.Dispatch<React.SetStateAction<DrawingMode>>;
    isEditingEnabled: boolean;
    setIsEditingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    showAllGeofences: boolean;
    setShowAllGeofences: React.Dispatch<React.SetStateAction<boolean>>;
    onSettingsClick: () => void;
}

export function GeofenceControls({
    condoId,
    geofences,
    mapShapes,
    onDataNeedsRefresh,
    selectedGeofenceId,
    setSelectedGeofenceId,
    defaultGeofenceId,
    setDefaultGeofenceId,
    mode,
    setMode,
    drawingManager,
    updateHistory,
    historyRef,
    historyIndexRef,
    setCanUndo,
    setCanRedo,
    clearListeners,
    drawingMode,
    setDrawingMode,
    isEditingEnabled,
    setIsEditingEnabled,
    showAllGeofences,
    setShowAllGeofences,
    onSettingsClick,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    const drawingCompleteListener = useRef<google.maps.MapsEventListener | null>(null);

    const [currentGeofenceName, setCurrentGeofenceName] = useState('');
    
    const isActionActive = mode === 'editing' || mode === 'drawing';
    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const resetActionStates = useCallback(() => {
        if (mode === 'editing' && selectedGeofenceId && historyRef.current.length > 0) {
            const originalGeometry = historyRef.current[0];
            const shape = mapShapes?.get(selectedGeofenceId);
            if(shape && originalGeometry) {
                const revertedShape = createShapeFromGeometry(originalGeometry);
                if(revertedShape) {
                    if('setPaths' in shape && 'getPaths' in revertedShape) (shape as any).setPaths((revertedShape as any).getPaths());
                    if('setBounds' in shape && 'getBounds' in revertedShape) (shape as any).setBounds((revertedShape as any).getBounds());
                    if('setRadius' in shape && 'getRadius' in revertedShape) (shape as any).setRadius((revertedShape as any).getRadius());
                     if ('setCenter' in shape && 'getCenter' in revertedShape) (shape as any).setCenter((revertedShape as any).getCenter());
                }
            }
        }
        
        if (drawingManager) drawingManager.setDrawingMode(null);
        setMode('view');
        historyRef.current = [];
        historyIndexRef.current = -1;
        setCanUndo(false);
        setCanRedo(false);
        clearListeners();
        setCurrentGeofenceName('');
    }, [mode, selectedGeofenceId, mapShapes, drawingManager, setMode, historyRef, historyIndexRef, setCanUndo, setCanRedo, clearListeners]);


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
        
        const newGeofenceId = `new_${Date.now()}`;
        const newMapShapes = new Map(mapShapes);
        newMapShapes.set(newGeofenceId, newShape);
        
        // This is a workaround, ideally we would not re-set the state like this
        // But for now it forces a re-render
        onDataNeedsRefresh();

        setSelectedGeofenceId(newGeofenceId);
        setMode('editing');
        setCurrentGeofenceName(getNextGeofenceName());
        updateHistory(getGeometryFromShape(newShape));
    }, [drawingManager, mapShapes, setSelectedGeofenceId, setMode, updateHistory, onDataNeedsRefresh]);

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
                drawingCompleteListener.current.remove();
            }
        }
    }, [mode, drawingManager, onOverlayComplete]);


     const handleStartEdit = () => {
        if (!selectedGeofenceId || !mapShapes) return;
        const shapeToEdit = mapShapes.get(selectedGeofenceId);
        const geofenceData = geofences.find(g => g.id === selectedGeofenceId);
        
        if (!shapeToEdit || !geofenceData) return;

        resetActionStates();
        updateHistory(getGeometryFromShape(shapeToEdit));
        setMode('editing');
        setCurrentGeofenceName(geofenceData.name);
    }

    const handleDelete = async () => {
        if (!selectedGeofenceId) return;
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
        if (!selectedGeofenceId || !mapShapes) return;

        const shapeToSave = mapShapes.get(selectedGeofenceId);
        if (!shapeToSave) return;
        
        const geometryToSave = getGeometryFromShape(shapeToSave);
        if (!currentGeofenceName) {
            toast({ title: t('toast.errorTitle'), description: "El nombre de la geocerca es obligatorio.", variant: "destructive"});
            return;
        }
        
        const isCreatingNew = selectedGeofenceId.startsWith('new_');
        let result: { success: boolean; message: string; data?: any; } | null = null;

        if (isCreatingNew) {
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
            const newSelectedId = isCreatingNew ? result.data?.id : selectedGeofenceId;
            onDataNeedsRefresh(newSelectedId);
            resetActionStates();
        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        }
    };
    
    const handleSetAsDefault = async () => {
        if (!selectedGeofenceId) return;
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

    return (
        <div className="space-y-4 pt-2 border-t">
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
                                <SelectTrigger className={cn("flex-1", mode === 'editing' && "text-[#2980b9] border-[#2980b9] font-bold")}>
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
                                <Button variant="ghost" size="icon" onClick={handleSetAsDefault} disabled={isActionActive || !selectedGeofenceId}>
                                    <Star className={cn("h-4 w-4", defaultGeofenceId === selectedGeofenceId && "fill-orange-400 text-orange-500")} />
                                    <span className="sr-only">{t('condoDashboard.map.geofence.setAsDefault')}</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleStartEdit} disabled={isActionActive || !selectedGeofenceId}>
                                    <Edit className="h-4 w-4"/>
                                    <span className="sr-only">{t('common.edit')}</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isActionActive || !selectedGeofenceId}>
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
                                    <Button onClick={() => resetActionStates()} variant="ghost">
                                        <X className="mr-2 h-4 w-4" /> {t('common.cancel')}
                                    </Button>
                                    <Button onClick={handleSaveGeofence}>
                                        <Save className="mr-2 h-4 w-4" /> {selectedGeofenceId?.startsWith('new_') ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                    </Button>
                                </div>
                            </div>
                    )}
                </fieldset>
            </div>
        </div>
    );
}
