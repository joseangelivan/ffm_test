

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

import type { Map as OlMap, Feature, Collection } from 'ol';
import { Draw, Modify, Translate } from 'ol/interaction';
import GeoJSON from 'ol/format/GeoJSON';
import { createBox } from 'ol/interaction/Draw';
import type { Vector as VectorSource } from 'ol/source';
import type { Geometry } from 'ol/geom';


export type DrawingMode = 'Polygon' | 'Rectangle' | 'Circle';

type ActiveShapeState = { id: string, feature: Feature | null, originalGeometry?: any } | null;

type GeofenceControlsProps = {
    condoId: string;
    geofences: DbGeofence[];
    setGeofences: React.Dispatch<React.SetStateAction<DbGeofence[]>>;
    onDataNeedsRefresh: (newSelectedId?: string) => void;
    selectedGeofenceId: string | null;
    setSelectedGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    defaultGeofenceId: string | null;
    setDefaultGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    mode: 'view' | 'editing';
    setMode: React.Dispatch<React.SetStateAction<'view' | 'editing'>>;
    showAllGeofences: boolean;
    setShowAllGeofences: React.Dispatch<React.SetStateAction<boolean>>;
    onSettingsClick: () => void;
    activeShapeState: ActiveShapeState;
    setActiveShapeState: React.Dispatch<React.SetStateAction<ActiveShapeState>>;
    mapRef: React.RefObject<OlMap | null>;
    drawingInteractionRef: React.MutableRefObject<Draw | null>;
    modifyInteractionRef: React.MutableRefObject<Modify | null>;
    translateInteractionRef: React.MutableRefObject<Translate | null>;
    historyStack: Geometry[];
    setHistoryStack: React.Dispatch<React.SetStateAction<Geometry[]>>;
    historyIndex: number;
    setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function GeofenceControls({
    condoId,
    geofences,
    setGeofences,
    onDataNeedsRefresh,
    selectedGeofenceId,
    setSelectedGeofenceId,
    defaultGeofenceId,
    setDefaultGeofenceId,
    mode,
    setMode,
    showAllGeofences,
    setShowAllGeofences,
    onSettingsClick,
    activeShapeState,
    setActiveShapeState,
    mapRef,
    drawingInteractionRef,
    modifyInteractionRef,
    translateInteractionRef,
    historyStack,
    setHistoryStack,
    historyIndex,
    setHistoryIndex,
}: GeofenceControlsProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [isSettingDefault, startSettingDefaultTransition] = useTransition();
    const [isDrawing, setIsDrawing] = useState(false);

    const [drawingMode, setDrawingMode] = useState<DrawingMode>('Polygon');
    const [currentGeofenceName, setCurrentGeofenceName] = useState('');

    const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none');
    
    const pushToHistory = useCallback((geometry: Geometry) => {
        const newStack = historyStack.slice(0, historyIndex + 1);
        newStack.push(geometry.clone());
        setHistoryStack(newStack);
        setHistoryIndex(newStack.length - 1);
    }, [historyStack, historyIndex, setHistoryStack, setHistoryIndex]);

    const removeInteractions = useCallback(() => {
        if (!mapRef.current) return;
        if (drawingInteractionRef.current) mapRef.current.removeInteraction(drawingInteractionRef.current);
        if (modifyInteractionRef.current) mapRef.current.removeInteraction(modifyInteractionRef.current);
        if (translateInteractionRef.current) mapRef.current.removeInteraction(translateInteractionRef.current);
        drawingInteractionRef.current = null;
        modifyInteractionRef.current = null;
        translateInteractionRef.current = null;
    }, [mapRef, drawingInteractionRef, modifyInteractionRef, translateInteractionRef]);

    const geofenceSourceRef = (): VectorSource | null => {
        const layer = mapRef.current?.getLayers().getArray().find(l => l.get('id') === 'geofence-layer');
        return (layer as any)?.getSource() || null;
    }

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

    const cancelCurrentAction = useCallback(() => {
        if (activeShapeState?.id?.startsWith('new-shape-')) {
            setGeofences(geofences.filter(g => g.id !== activeShapeState.id));
        }

        const source = geofenceSourceRef();
        if (activeShapeState?.feature) {
             const feature = activeShapeState.feature;
             const originalGeometry = activeShapeState.originalGeometry;
             if (originalGeometry && feature) {
                const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
                const olGeom = format.readGeometry(originalGeometry);
                if (olGeom) feature.setGeometry(olGeom);
             }
        }
        
        removeInteractions();

        setActiveShapeState(null);
        setCurrentGeofenceName('');
        setIsDrawing(false);
        setHistoryStack([]);
        setHistoryIndex(-1);
    }, [activeShapeState, removeInteractions, setActiveShapeState, geofences, setGeofences, geofenceSourceRef, setHistoryStack, setHistoryIndex]);
      
     const startEditingSelected = useCallback(() => {
        const source = geofenceSourceRef();
        if (!selectedGeofenceId || !source || !mapRef.current) return;
        
        const featureToEdit = source.getFeatureById(selectedGeofenceId) as Feature;
        const selectedGeofence = geofences.find(g => g.id === selectedGeofenceId);
        
        if (!selectedGeofence || !featureToEdit) return;
    
        cancelCurrentAction();
        setMode('editing');
        removeInteractions();

        const features = new (require('ol/Collection').default)([featureToEdit]) as Collection<Feature>;

        const modify = new Modify({
            features: features,
            geometryFunction: drawingMode === 'Rectangle' ? (geometry: any) => {
                 const coords = geometry.getCoordinates()[0];
                 const minX = Math.min(coords[0][0], coords[1][0], coords[2][0], coords[3][0]);
                 const minY = Math.min(coords[0][1], coords[1][1], coords[2][1], coords[3][1]);
                 const maxX = Math.max(coords[0][0], coords[1][0], coords[2][0], coords[3][0]);
                 const maxY = Math.max(coords[0][1], coords[1][1], coords[2][1], coords[3][1]);
                 const newCoords = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]];
                 geometry.setCoordinates([newCoords]);
                 return geometry;
            } : undefined,
        });
        modify.on('modifyend', () => pushToHistory(featureToEdit.getGeometry()!));
        mapRef.current.addInteraction(modify);
        modifyInteractionRef.current = modify;
        
        const translate = new Translate({ features: features });
        translate.on('translateend', () => pushToHistory(featureToEdit.getGeometry()!));
        mapRef.current.addInteraction(translate);
        translateInteractionRef.current = translate;

        setActiveShapeState({ 
            id: selectedGeofenceId, 
            feature: featureToEdit, 
            originalGeometry: selectedGeofence.geometry 
        });
        setCurrentGeofenceName(selectedGeofence.name);
        setHistoryStack([featureToEdit.getGeometry()!.clone()]);
        setHistoryIndex(0);
    }, [selectedGeofenceId, geofences, cancelCurrentAction, setMode, setActiveShapeState, removeInteractions, mapRef, modifyInteractionRef, translateInteractionRef, geofenceSourceRef, pushToHistory, setHistoryStack, setHistoryIndex, drawingMode]);
      
    const saveCurrentAction = useCallback(async () => {
        if (!activeShapeState?.feature) return;
        const { id, feature } = activeShapeState;
    
        const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
        const geometryToSave = format.writeGeometryObject(feature.getGeometry()!);
        
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
            await onDataNeedsRefresh(newSelectedId);
            removeInteractions();
            setMode('view');
            setActiveShapeState(null);
            setCurrentGeofenceName('');
            setHistoryStack([]);
            setHistoryIndex(-1);

        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        }
    }, [condoId, currentGeofenceName, activeShapeState, geofences.length, onDataNeedsRefresh, t, toast, setActiveShapeState, setMode, removeInteractions, setHistoryStack, setHistoryIndex]);

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
    
    const handleStartDrawing = () => {
        const map = mapRef.current;
        const source = geofenceSourceRef();

        if (!map || !source) return;

        cancelCurrentAction();
        
        const drawOptions: any = { source: source };
        if (drawingMode === 'Rectangle') {
            drawOptions.type = 'Circle';
            drawOptions.geometryFunction = createBox();
        } else {
            drawOptions.type = drawingMode;
        }

        const newInteraction = new Draw(drawOptions);
        drawingInteractionRef.current = newInteraction;

        newInteraction.on('drawend', (event) => {
            const newFeature = event.feature;
            const newId = `new-shape-${Date.now()}`;
            newFeature.setId(newId);
            
            map.removeInteraction(newInteraction);
            drawingInteractionRef.current = null;
            
            const Collection = require('ol/Collection').default;
            const features = new Collection([newFeature]);
            
            const modify = new Modify({ features: features });
            modify.on('modifyend', () => pushToHistory(newFeature.getGeometry()!));
            map.addInteraction(modify);
            modifyInteractionRef.current = modify;

            const translate = new Translate({ features: features });
            translate.on('translateend', () => pushToHistory(newFeature.getGeometry()!));
            map.addInteraction(translate);
            translateInteractionRef.current = translate;

            const placeholderGeofence: DbGeofence = {
                id: newId,
                condominium_id: condoId,
                name: getNextGeofenceName(),
                geometry: {},
                is_default: false,
            };

            setGeofences(current => [...current, placeholderGeofence]);
            setSelectedGeofenceId(newId);
            setCurrentGeofenceName(placeholderGeofence.name);
            setActiveShapeState({ id: newId, feature: newFeature, originalGeometry: null });
            setIsDrawing(false);
            setHistoryStack([newFeature.getGeometry()!.clone()]);
            setHistoryIndex(0);
        });

        map.addInteraction(newInteraction);
        setIsDrawing(true);
        setCurrentGeofenceName(getNextGeofenceName());
    };
    
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
                                <Select value={selectedGeofenceId || ''} onValueChange={setSelectedGeofenceId} disabled={!!activeShapeState || isDrawing || isBusy}>
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
                        
                        
                            {activeShapeState || isDrawing ? (
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
                                        <Button onClick={handleSaveGeofence} disabled={isSaving || (!activeShapeState?.feature && !isDrawing)}>
                                            {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            {activeShapeState?.id.startsWith('new-shape-') ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex items-center gap-2">
                                    <Button onClick={handleStartDrawing} variant="outline" className="flex-1" disabled={!!activeShapeState || isBusy}>
                                        <PencilRuler className="mr-2 h-4 w-4"/>
                                        {t('condoDashboard.map.geofence.draw')}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-40 justify-between" disabled={!!activeShapeState || isBusy}>
                                                <span>
                                                    {drawingMode === 'Polygon' && t('condoDashboard.map.shapes.polygon')}
                                                    {drawingMode === 'Rectangle' && t('condoDashboard.map.shapes.rectangle')}
                                                    {drawingMode === 'Circle' && t('condoDashboard.map.shapes.circle')}
                                                </span>
                                                <ChevronDown className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => setDrawingMode('Polygon')}>{t('condoDashboard.map.shapes.polygon')}</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setDrawingMode('Rectangle')}>{t('condoDashboard.map.shapes.rectangle')}</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setDrawingMode('Circle')}>{t('condoDashboard.map.shapes.circle')}</DropdownMenuItem>
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
