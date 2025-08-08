
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  PencilRuler,
  ChevronDown,
  Save,
  Star,
  Layers,
  Edit,
  Trash2,
} from 'lucide-react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

import type { GeofenceObject } from '../condo-map-tab';
import { getGeometryFromShape, createShapeFromGeometry, SAVED_COLOR, DEFAULT_COLOR, VIEW_ALL_COLOR } from '../condo-map-tab';
import { createGeofence, updateGeofence, deleteGeofence, setCondoDefaultGeofence } from '@/actions/maps';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type DrawingMode = 'polygon' | 'rectangle' | 'circle';

const GeofenceDrawingManager = ({
    drawingMode,
    onOverlayComplete,
}: {
    drawingMode: DrawingMode;
    onOverlayComplete: (overlay: google.maps.MVCObject) => void;
}) => {
    const map = useMap();
    const drawing = useMapsLibrary('drawing');
    
    useEffect(() => {
        if (!map || !drawing) return;

        const newDrawingManager = new drawing.DrawingManager({
            drawingMode: drawing.OverlayType[drawingMode.toUpperCase() as keyof typeof google.maps.drawing.OverlayType],
            drawingControl: false,
            polygonOptions: { ...SAVED_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1, suppressUndo: true },
            rectangleOptions: { ...SAVED_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1, suppressUndo: true },
            circleOptions: { ...SAVED_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1, suppressUndo: true },
        });
        
        newDrawingManager.setMap(map);

        const listener = (event: any) => {
            onOverlayComplete(event.overlay);
            newDrawingManager.setDrawingMode(null);
        };
        
        const overlayCompleteListener = google.maps.event.addListener(newDrawingManager, 'overlaycomplete', listener);

        return () => {
            google.maps.event.removeListener(overlayCompleteListener);
            newDrawingManager.setMap(null);
        };
    }, [map, drawing, onOverlayComplete, drawingMode]);

    return null;
};


type GeofenceControlsProps = {
    condoId: string;
    geofences: GeofenceObject[];
    setGeofences: React.Dispatch<React.SetStateAction<GeofenceObject[]>>;
    selectedGeofenceId: string | null;
    setSelectedGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    defaultGeofenceId: string | null;
    setDefaultGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    isDrawing: boolean;
    setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    isCreating: boolean;
    setIsCreating: React.Dispatch<React.SetStateAction<boolean>>;
    activeOverlay: google.maps.MVCObject | null;
    setActiveOverlay: React.Dispatch<React.SetStateAction<google.maps.MVCObject | null>>;
    updateHistory: (geometry: any) => void;
    historyRef: React.MutableRefObject<any[]>;
    historyIndexRef: React.MutableRefObject<number>;
    setCanUndo: React.Dispatch<React.SetStateAction<boolean>>;
    setCanRedo: React.Dispatch<React.SetStateAction<boolean>>;
    clearListeners: () => void;
    map: google.maps.Map | null;
    drawingMode: DrawingMode;
    setDrawingMode: React.Dispatch<React.SetStateAction<DrawingMode>>;
    isEditingEnabled: boolean;
    setIsEditingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    viewAll: boolean;
    setViewAll: React.Dispatch<React.SetStateAction<boolean>>;
}

export function GeofenceControls({
    condoId,
    geofences,
    setGeofences,
    selectedGeofenceId,
    setSelectedGeofenceId,
    defaultGeofenceId,
    setDefaultGeofenceId,
    isDrawing,
    setIsDrawing,
    isEditing,
    setIsEditing,
    isCreating,
    setIsCreating,
    activeOverlay,
    setActiveOverlay,
    updateHistory,
    historyRef,
    historyIndexRef,
    setCanUndo,
    setCanRedo,
    clearListeners,
    map,
    drawingMode,
    setDrawingMode,
    isEditingEnabled,
    setIsEditingEnabled,
    viewAll,
    setViewAll,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();

    const [currentGeofenceName, setCurrentGeofenceName] = useState('');

    const isActionActive = isDrawing || isEditing || isCreating;
    const isEditingShape = isEditing || isCreating;
    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const resetActionStates = useCallback(() => {
        if (activeOverlay) {
            // @ts-ignore
            activeOverlay.setMap(null);
        }
        setIsDrawing(false);
        setIsEditing(false);
        setIsCreating(false);
        setActiveOverlay(null);
        historyRef.current = [];
        historyIndexRef.current = -1;
        setCanUndo(false);
        setCanRedo(false);
        clearListeners();
    }, [activeOverlay, clearListeners, historyIndexRef, historyRef, setActiveOverlay, setCanRedo, setCanUndo, setIsCreating, setIsDrawing, setIsEditing]);

    const handleToggleDrawing = () => {
        if(isActionActive) {
            resetActionStates();
        } else {
            resetActionStates();
            setIsDrawing(true);
        }
    }

     const handleStartEdit = () => {
        if (!selectedGeofenceId) return;
        const geofenceToEdit = geofences.find(g => g.id === selectedGeofenceId);
        if (!geofenceToEdit) return;

        const geometry = getGeometryFromShape(geofenceToEdit.shape);
        const shape = createShapeFromGeometry(geometry);
        
        if (!shape) {
            toast({ title: t('toast.errorTitle'), description: t('condoDashboard.map.toast.shapeCloneError'), variant: "destructive"});
            return;
        }
        
        resetActionStates();
        setIsEditing(true);
        setActiveOverlay(shape);
        setCurrentGeofenceName(geofenceToEdit.name);
        updateHistory(geometry);
    }

    const handleDelete = async () => {
        if (!selectedGeofenceId) return;
        const idToDelete = selectedGeofenceId;
        
        const geofenceToRemove = geofences.find(g => g.id === idToDelete);
        if (geofenceToRemove && geofenceToRemove.shape) {
            // @ts-ignore
            geofenceToRemove.shape.setMap(null);
        }

        const result = await deleteGeofence(idToDelete);
        if (!result.success) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
            return;
        }

        setGeofences(prev => {
            const newGeofences = prev.filter(g => g.id !== idToDelete);
            
            if(idToDelete === defaultGeofenceId) {
                setDefaultGeofenceId(newGeofences.length > 0 ? newGeofences[0].id : null);
            }
            
            if (idToDelete === selectedGeofenceId) {
                setSelectedGeofenceId(newGeofences.length > 0 ? newGeofences[0].id : null);
            }

            return newGeofences;
        });

        if (isEditing || isCreating) resetActionStates();
        toast({ title: t('condoDashboard.map.toast.geofenceDeleted'), variant: "destructive" });
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
        if (!activeOverlay) return;

        const geometryToSave = getGeometryFromShape(activeOverlay);
        if (!currentGeofenceName) {
            toast({ title: t('toast.errorTitle'), description: "El nombre de la geocerca es obligatorio.", variant: "destructive"});
            return;
        }
        
        if (isCreating) { // Saving new
            const result = await createGeofence({
                condoId,
                name: currentGeofenceName,
                geometry: geometryToSave,
                isDefault: geofences.length === 0,
            });

            if(result.success && result.data) {
                const newGeofence: GeofenceObject = { id: result.data.id, name: result.data.name, shape: createShapeFromGeometry(result.data.geometry) as google.maps.MVCObject };
                setGeofences(prev => [...prev, newGeofence]);
                setSelectedGeofenceId(newGeofence.id);
                if(result.data.is_default) setDefaultGeofenceId(newGeofence.id);
                toast({ title: t('condoDashboard.map.toast.geofenceSaved.title'), description: t('condoDashboard.map.toast.geofenceSaved.description', {name: newGeofence.name})});
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
                 return;
            }

        } else if (isEditing && selectedGeofenceId) { // Editing existing
            const result = await updateGeofence(selectedGeofenceId, { name: currentGeofenceName, geometry: geometryToSave });
            
            if (result.success) {
                setGeofences(prev => prev.map(g => 
                    g.id === selectedGeofenceId 
                    ? {...g, name: currentGeofenceName, shape: createShapeFromGeometry(geometryToSave) as google.maps.MVCObject} 
                    : g
                ));
                toast({ title: t('condoDashboard.map.toast.geofenceUpdated') });
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
                 return;
            }
        }

        resetActionStates();
    };
    
    useEffect(() => {
        if(isCreating) {
            setCurrentGeofenceName(getNextGeofenceName());
        }
    }, [isCreating, getNextGeofenceName, t, geofences]);


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
            setViewAll(false);
            resetActionStates();
        }
    };

    return (
        <div className="space-y-4 pt-2 border-t">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="default-geofence">{t('condoDashboard.map.geofence.defaultLabel')}</Label>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="view-all" checked={viewAll} onCheckedChange={(checked) => setViewAll(!!checked)} disabled={isEditingEnabled}/>
                        <label htmlFor="view-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t('condoDashboard.map.geofence.viewAll')}
                        </label>
                    </div>
                </div>
                <div className="relative flex items-center">
                    {defaultGeofenceId && (
                        <Star className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500 fill-orange-400" />
                    )}
                    <Input id="default-geofence" value={defaultGeofenceName} readOnly disabled className="pl-8"/>
                </div>
            </div>

            <div className="pt-4 border-t space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox id="enable-editing" checked={isEditingEnabled} onCheckedChange={(checked) => handleEditingEnabledChange(!!checked)}/>
                    <label htmlFor="enable-editing" className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {t('condoDashboard.map.geofence.editMode')}
                    </label>
                </div>

                <fieldset disabled={!isEditingEnabled} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Select value={selectedGeofenceId || ''} onValueChange={id => { if(!isActionActive) setSelectedGeofenceId(id) }} disabled={isActionActive}>
                                <SelectTrigger className={cn("flex-1", isEditingShape && "text-[#2980b9] border-[#2980b9] font-bold")}>
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
                        <Button onClick={handleToggleDrawing} variant={isActionActive ? "destructive" : "outline"} className="flex-1">
                            <PencilRuler className="mr-2 h-4 w-4"/>
                            {isActionActive ? t('common.cancel') : t('condoDashboard.map.geofence.draw')}
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
                    
                        {isEditingShape && (
                            <div className='space-y-4'>
                                <div className="space-y-2">
                                    <Label htmlFor="geofence-name">{t('adminDashboard.newCondoDialog.nameLabel')}</Label>
                                    <Input 
                                        id="geofence-name" 
                                        value={currentGeofenceName}
                                        onChange={(e) => setCurrentGeofenceName(e.target.value)}
                                        placeholder={t('condoDashboard.map.geofence.defaultName')}
                                    />
                                </div>
                                <Button onClick={handleSaveGeofence} className="w-full">
                                    <Save className="mr-2 h-4 w-4" /> {isCreating ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                </Button>
                            </div>
                    )}
                </fieldset>
            </div>
        </div>
    );
}

GeofenceControls.DrawingManager = GeofenceDrawingManager;
