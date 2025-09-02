

"use client";

import React, { useState, useEffect, useCallback, useTransition, useMemo, useRef } from 'react';
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
import type { Map as OlMap } from 'ol';
import Feature from 'ol/Feature';
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

import { Draw, Modify, Translate } from 'ol/interaction';
import GeoJSON from 'ol/format/GeoJSON';
import { createBox } from 'ol/interaction/Draw';
import type { Geometry, Polygon, SimpleGeometry } from 'ol/geom';
import Collection from 'ol/Collection';
import type VectorSource from 'ol/source/Vector';


const puntoEstaDentro = (poligono: Polygon, punto: number[]): boolean => {
    return poligono.intersectsCoordinate(punto);
}

const RecalcularRectangulo = (verticesOriginales: number[][], verticeMovido: number[], indiceMovido: number): number[][] => {
    const indiceOpuesto = (indiceMovido + 2) % 4;
    const verticeOpuesto = verticesOriginales[indiceOpuesto];
  
    const nuevoRectangulo = [
        [verticeMovido[0], verticeMovido[1]],
        [verticeOpuesto[0], verticeMovido[1]],
        [verticeOpuesto[0], verticeOpuesto[1]],
        [verticeMovido[0], verticeOpuesto[1]],
    ];
  
  return [...nuevoRectangulo, nuevoRectangulo[0]];
};



export type DrawingMode = 'Polygon' | 'Rectangle' | 'Circle';

type ActiveShapeState = { id: string, feature: Feature<any> | null, originalGeometry?: any } | null;

type GeofenceControlsProps = {
    condoId: string;
    geofences: DbGeofence[];
    onDataNeedsRefresh: (newSelectedId?: string) => void;
    onShapeDrawn: (feature: Feature) => void;
    activeShapeState: ActiveShapeState;
    selectedGeofenceId: string | null;
    setSelectedGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    defaultGeofenceId: string | null;
    setDefaultGeofenceId: React.Dispatch<React.SetStateAction<string | null>>;
    mode: 'view' | 'editing';
    setMode: React.Dispatch<React.SetStateAction<'view' | 'editing'>>;
    showAllGeofences: boolean;
    setShowAllGeofences: React.Dispatch<React.SetStateAction<boolean>>;
    onSettingsClick: () => void;
    mapRef: React.RefObject<OlMap | null>;
    historyStack: Geometry[];
    setHistoryStack: React.Dispatch<React.SetStateAction<Geometry[]>>;
    historyIndex: number;
    setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function GeofenceControls({
    condoId,
    geofences,
    onDataNeedsRefresh,
    onShapeDrawn,
    activeShapeState,
    selectedGeofenceId,
    setSelectedGeofenceId,
    defaultGeofenceId,
    setDefaultGeofenceId,
    mode,
    setMode,
    showAllGeofences,
    setShowAllGeofences,
    onSettingsClick,
    mapRef,
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
    
    const interactionsRef = useRef<{ draw: Draw | null, modify: Modify | null, translate: Translate | null }>({
        draw: null,
        modify: null,
        translate: null
    });
    
    const geofenceSourceRef = useRef<VectorSource | null>(null);
    useEffect(() => {
        if (mapRef.current) {
            const layer = mapRef.current.getLayers().getArray().find(l => l.get('id') === 'geofence-layer') as any;
            if (layer) {
                geofenceSourceRef.current = layer.getSource();
            }
        }
    }, [mapRef, activeShapeState]);


    const pushToHistory = useCallback((geometry: Geometry) => {
        const newStack = historyStack.slice(0, historyIndex + 1);
        newStack.push(geometry.clone());
        setHistoryStack(newStack);
        setHistoryIndex(newStack.length - 1);
    }, [historyIndex, historyStack, setHistoryStack, setHistoryIndex]);

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

    const removeAllInteractions = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        if (interactionsRef.current.draw) map.removeInteraction(interactionsRef.current.draw);
        if (interactionsRef.current.modify) map.removeInteraction(interactionsRef.current.modify);
        if (interactionsRef.current.translate) map.removeInteraction(interactionsRef.current.translate);
        interactionsRef.current = { draw: null, modify: null, translate: null };
    }, [mapRef]);

    const cancelCurrentAction = useCallback(() => {
        const source = geofenceSourceRef.current;
        if (activeShapeState?.feature) {
             const { feature, originalGeometry } = activeShapeState;
             if (originalGeometry && feature) {
                const geometryToRestore = { ...originalGeometry };
                 if (geometryToRestore.type === 'rectangle') {
                    geometryToRestore.type = 'Polygon'; 
                }
                const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
                const olGeom = format.readGeometry(geometryToRestore);
                if (olGeom) feature.setGeometry(olGeom);
             } else if (feature.getId()?.toString().startsWith('new-shape-')) {
                if (source && source.hasFeature(feature)) {
                    source.removeFeature(feature);
                }
             }
        }
        
        removeAllInteractions();
        onShapeDrawn(new Feature());
        setCurrentGeofenceName('');
        setHistoryStack([]);
        setHistoryIndex(-1);
    }, [activeShapeState, removeAllInteractions, onShapeDrawn, setHistoryStack, setHistoryIndex]);
    
    const saveCurrentAction = useCallback(async () => {
        if (!activeShapeState?.feature) return;
        const { id, feature } = activeShapeState;
    
        const geometryToSave = new GeoJSON({ featureProjection: 'EPSG:3857' }).writeGeometryObject(feature.getGeometry()!);
        
        if (feature.get('geometryType') === 'Rectangle') {
            (geometryToSave as any).type = "Polygon"; 
        }
        
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
            cancelCurrentAction();
        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: "destructive" });
        }
    }, [condoId, currentGeofenceName, activeShapeState, geofences.length, onDataNeedsRefresh, t, toast, cancelCurrentAction]);

    const handleSaveGeofence = () => {
        startSavingTransition(async () => {
            await saveCurrentAction();
        });
    };
    
    const handleStartDrawing = () => {
        cancelCurrentAction();
        setCurrentGeofenceName(getNextGeofenceName());
        setIsDrawing(true);
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
    
    const startEditingSelected = useCallback(() => {
        const source = geofenceSourceRef.current;
        if (!selectedGeofenceId || !source) return;

        const featureToEdit = source.getFeatureById(selectedGeofenceId) as Feature<Polygon>;
        const selectedGeofence = geofences.find(g => g.id === selectedGeofenceId);

        if (!selectedGeofence || !featureToEdit) return;

        cancelCurrentAction();
        setIsDrawing(false);
        
        onShapeDrawn(featureToEdit);
        setCurrentGeofenceName(selectedGeofence.name);
        
        const initialGeom = featureToEdit.getGeometry();
        if (initialGeom) {
            pushToHistory(initialGeom);
        }
    }, [geofences, selectedGeofenceId, onShapeDrawn, pushToHistory, cancelCurrentAction]);
    
     useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        removeAllInteractions();

        if (mode === 'editing') {
            if (isDrawing) {
                const drawOptions: any = { source: geofenceSourceRef.current };
                if (drawingMode === 'Rectangle') {
                    drawOptions.type = 'Circle';
                    drawOptions.geometryFunction = createBox();
                } else {
                    drawOptions.type = drawingMode;
                }

                const newInteraction = new Draw(drawOptions);
                map.addInteraction(newInteraction);
                interactionsRef.current.draw = newInteraction;

                newInteraction.once('drawend', (event) => {
                    const feature = event.feature;
                    if (drawingMode === 'Rectangle') {
                        feature.set('geometryType', 'Rectangle');
                    }
                    onShapeDrawn(feature);
                    setIsDrawing(false);
                });

            } else if (activeShapeState?.feature) {
                const featureToEdit = activeShapeState.feature;
                const features = new Collection([featureToEdit]);

                let modifyInteraction;
                const isRectangle = featureToEdit.get('geometryType') === 'Rectangle';

                if (isRectangle) {
                    let pointerDownCoordinate: number[] | null = null;

                    map.on('pointerdown', (evt) => {
                        pointerDownCoordinate = evt.coordinate;
                    });
                    
                    const geometryFunction = (coordinates: any[], geometry: any): Geometry => {
                        const originalPolygon = (featureToEdit.getGeometry() as Polygon);
                        const originalVertices = originalPolygon.getCoordinates()[0].slice(0, 4);

                        if (!pointerDownCoordinate) {
                            geometry.setCoordinates(coordinates);
                            return geometry;
                        }

                        // Find the vertex closest to where the user clicked
                        let closestVertexIndex = -1;
                        let minDistance = Infinity;
                        originalVertices.forEach((vertex, index) => {
                            const distance = Math.pow(vertex[0] - pointerDownCoordinate![0], 2) + Math.pow(vertex[1] - pointerDownCoordinate![1], 2);
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestVertexIndex = index;
                            }
                        });

                        const draggedVertex = coordinates[0][closestVertexIndex];

                        if (draggedVertex) {
                           const newCoords = RecalcularRectangulo(originalVertices, draggedVertex, closestVertexIndex);
                           geometry.setCoordinates([newCoords]);
                        } else {
                           geometry.setCoordinates(coordinates);
                        }
                        
                        return geometry;
                    };
                    modifyInteraction = new Modify({ features, geometryFunction });
                } else {
                    modifyInteraction = new Modify({ features, insertVertexCondition: () => false });
                }
                
                map.addInteraction(modifyInteraction);
                interactionsRef.current.modify = modifyInteraction;

                modifyInteraction.on('modifyend', (event: any) => {
                    const feature = event.features.getArray()[0];
                    if (feature) pushToHistory(feature.getGeometry()!.clone());
                });

                const translate = new Translate({ features });
                map.addInteraction(translate);
                interactionsRef.current.translate = translate;

                translate.on('translateend', (e: any) => {
                    const feature = e.features.getArray()[0];
                    if (feature) pushToHistory(feature.getGeometry()!.clone());
                });
            }
        }
        
        return () => removeAllInteractions();

    }, [mode, isDrawing, activeShapeState, drawingMode, pushToHistory, removeAllInteractions, onShapeDrawn, mapRef]);

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
                            <Input id="default-geofence" value={geofences.find(g => g.id === defaultGeofenceId)?.name || t('condoDashboard.map.geofence.none')} readOnly disabled className="pl-8 text-xs h-8"/>
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
                                if (!checked) {
                                    cancelCurrentAction();
                                }
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
                                <Select value={selectedGeofenceId || ''} onValueChange={setSelectedGeofenceId} disabled={!!activeShapeState?.feature || isBusy}>
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
                                                <Button variant="ghost" size="icon" disabled={!!activeShapeState?.feature || !selectedGeofenceId || isBusy || defaultGeofenceId === selectedGeofenceId} onClick={handleSetAsDefault}>
                                                    {isSettingDefault ? <Loader className="h-4 w-4 animate-spin"/> : <Star className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('condoDashboard.map.geofence.setAsDefault')}</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={startEditingSelected} disabled={!!activeShapeState?.feature || !selectedGeofenceId || isBusy || (selectedGeofenceId !== null && selectedGeofenceId.startsWith('new-shape-'))}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.edit')}</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={!!activeShapeState?.feature || !selectedGeofenceId || isBusy || (selectedGeofenceId !== null && selectedGeofenceId.startsWith('new-shape-'))}>
                                                    {isDeleting ? <Loader className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive"/>}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.delete')}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        
                        
                            {activeShapeState?.feature ? (
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
                                        <Button onClick={handleSaveGeofence} disabled={isSaving || !activeShapeState?.feature}>
                                            {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            {activeShapeState?.id.startsWith('new-shape-') ? t('condoDashboard.map.geofence.saveButton') : t('common.saveChanges')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex items-center gap-2">
                                    <Button onClick={handleStartDrawing} variant="outline" className="flex-1" disabled={!!activeShapeState?.feature || isBusy}>
                                        <PencilRuler className="mr-2 h-4 w-4"/>
                                        {t('condoDashboard.map.geofence.draw')}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-40 justify-between" disabled={!!activeShapeState?.feature || isBusy}>
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
