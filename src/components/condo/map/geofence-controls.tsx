

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
import type { Map as OlMap, Feature as OlFeature } from 'ol';
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
import { Polygon } from 'ol/geom';
import type { Geometry, SimpleGeometry } from 'ol/geom';
import Collection from 'ol/Collection';
import type VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { Style } from 'ol/style';


const puntoEstaDentro = (poligono: Polygon, punto: number[]): boolean => {
    return poligono.intersectsCoordinate(punto);
}

const RecalcularRectangulo = (verticesOriginales: number[][], verticeMovido: number[], indiceMovido: number): number[][] => {
    const olPolygon = require('ol/geom/Polygon').default;

    const poligonoOriginal = new olPolygon([verticesOriginales]);
    if (!puntoEstaDentro(poligonoOriginal, verticeMovido)) {
        const tempVertices = [...verticesOriginales];
        tempVertices[indiceMovido] = verticeMovido;
        const xs = tempVertices.map(v => v[0]);
        const ys = tempVertices.map(v => v[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const rectanguloPerfecto = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
        return [...rectanguloPerfecto, rectanguloPerfecto[0]];
    }

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

type ActiveShapeState = { id: string, feature: OlFeature<any> | null, originalGeometry?: any } | null;

type GeofenceControlsProps = {
    condoId: string;
    geofences: DbGeofence[];
    onDataNeedsRefresh: (newSelectedId?: string) => void;
    onShapeDrawn: (feature: OlFeature) => void;
    activeShapeState: ActiveShapeState;
    setActiveShapeState: React.Dispatch<React.SetStateAction<ActiveShapeState>>;
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
    setActiveShapeState,
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
    const originalGeometryOnModifyStart = useRef<Geometry | null>(null);

    useEffect(() => {
        if (mapRef.current) {
            const layer = mapRef.current.getLayers().getArray().find(l => l.get('id') === 'geofence-layer') as any;
            if (layer) {
                geofenceSourceRef.current = layer.getSource();
            }
        }
    }, [mapRef]);


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
        if (interactionsRef.current.modify) {
            interactionsRef.current.modify.dispose();
            map.removeInteraction(interactionsRef.current.modify);
        }
        if (interactionsRef.current.translate) map.removeInteraction(interactionsRef.current.translate);
        interactionsRef.current = { draw: null, modify: null, translate: null };
    }, [mapRef]);

    const cancelCurrentAction = useCallback(() => {
        const source = geofenceSourceRef.current;
        if (activeShapeState?.feature) {
             const { feature, originalGeometry } = activeShapeState;
             if (originalGeometry && feature) {
                const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
                const olGeom = format.readGeometry(originalGeometry);
                if (olGeom) feature.setGeometry(olGeom);
             } else if (feature.getId()?.toString().startsWith('new-shape-')) {
                if (source && source.hasFeature(feature)) {
                    source.removeFeature(feature);
                }
             }
        }
        
        removeAllInteractions();
        setActiveShapeState(null);
        setCurrentGeofenceName('');
        setHistoryStack([]);
        setHistoryIndex(-1);
    }, [activeShapeState, removeAllInteractions, setActiveShapeState, setHistoryStack, setHistoryIndex]);
    
    const saveCurrentAction = useCallback(async () => {
        if (!activeShapeState?.feature) return;
        const { id, feature } = activeShapeState;
    
        const geometryToSave = new GeoJSON({ featureProjection: 'EPSG:3857' }).writeGeometryObject(feature.getGeometry()!);
        
        if (!currentGeofenceName) {
            toast({ title: t('toast.errorTitle'), description: "El nombre de la geocerca es obligatorio.", variant: "destructive" });
            return;
        }
        
        let result: { success: boolean; message: string; data?: any; } | null = null;
        const isNewShape = id.startsWith('new-shape-');
    
        startSavingTransition(async () => {
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
        });
    }, [condoId, currentGeofenceName, activeShapeState, geofences.length, onDataNeedsRefresh, t, toast, cancelCurrentAction]);
    
    const handleStartDrawing = () => {
        cancelCurrentAction();
        const newName = getNextGeofenceName();
        const newId = `new-shape-${Date.now()}`;
        const newFeature = new Feature();
        newFeature.setId(newId);

        setActiveShapeState({
            id: newId,
            feature: newFeature,
            originalGeometry: null
        });
        setCurrentGeofenceName(newName);
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

        const selectedGeofenceData = geofences.find(g => g.id === selectedGeofenceId);
        if (!selectedGeofenceData) return;

        cancelCurrentAction();
        setIsDrawing(false);

        let featureToEdit = source.getFeatureById(selectedGeofenceId) as OlFeature<Polygon> | null;
        const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
        const geometry = format.readGeometry(selectedGeofenceData.geometry);
        if (!geometry) {
             toast({ title: t('toast.errorTitle'), description: "No se pudo cargar la geometría de la geocerca.", variant: 'destructive' });
             return;
        }

        if (featureToEdit) {
            featureToEdit.setGeometry(geometry);
        } else {
            featureToEdit = new Feature(geometry);
            featureToEdit.setId(selectedGeofenceData.id);
            source.addFeature(featureToEdit);
        }
        
        const originalGeom = featureToEdit.getGeometry()?.clone();
        
        setActiveShapeState({
            id: selectedGeofenceId,
            feature: featureToEdit,
            originalGeometry: originalGeom ? new GeoJSON({ featureProjection: 'EPSG:3857' }).writeGeometryObject(originalGeom) : null
        });
        setCurrentGeofenceName(selectedGeofenceData.name);
        
        if (originalGeom) {
            pushToHistory(originalGeom);
        }

    }, [geofences, selectedGeofenceId, cancelCurrentAction, pushToHistory, toast, t, setActiveShapeState]);
    
     useEffect(() => {
        const map = mapRef.current;
        const source = geofenceSourceRef.current;
        if (!map || !source) return;

        removeAllInteractions();

        if (mode === 'editing') {
            if (isDrawing) {
                const newInteraction = new Draw({
                    source: source,
                    type: drawingMode === 'Rectangle' ? 'Circle' : drawingMode,
                    geometryFunction: drawingMode === 'Rectangle' ? Draw.createBox() : undefined,
                });
                map.addInteraction(newInteraction);
                interactionsRef.current.draw = newInteraction;

                newInteraction.once('drawend', (event) => {
                    const drawnFeature = event.feature;
                    if (drawingMode === 'Rectangle') {
                        drawnFeature.set('geometryType', 'Rectangle');
                    }
                    onShapeDrawn(drawnFeature);
                    setIsDrawing(false);
                });

            } else if (activeShapeState?.feature) {
                const featureToEdit = activeShapeState.feature;
                const features = new Collection([featureToEdit]);
                const isRectangle = featureToEdit.get('geometryType') === 'Rectangle';
                
                 const modifyInteraction = new Modify({ 
                    features: features,
                    style: new Style({
                        image: new (require('ol/style').Circle)({
                            radius: 7,
                            fill: new (require('ol/style').Fill)({ color: 'rgba(255, 0, 0, 0.8)' }),
                            stroke: new (require('ol/style').Stroke)({ color: 'white', width: 2 })
                        }),
                    }),
                    insertVertexCondition: () => !isRectangle,
                });
                map.addInteraction(modifyInteraction);
                interactionsRef.current.modify = modifyInteraction;

                modifyInteraction.on('modifystart', (e) => {
                    originalGeometryOnModifyStart.current = (e.features.getArray()[0].getGeometry() as Geometry)?.clone() || null;
                });
                
                modifyInteraction.on('modifyend', (e) => {
                    const feature = e.features.getArray()[0] as OlFeature<Polygon>;
                    const finalGeometry = feature.getGeometry();
                    if (!finalGeometry) return;

                    if (!isRectangle || !originalGeometryOnModifyStart.current) {
                        pushToHistory(finalGeometry.clone());
                        return;
                    }
                    
                    const originalVertices = (originalGeometryOnModifyStart.current as Polygon).getCoordinates()[0].slice(0, 4);
                    const newVertices = finalGeometry.getCoordinates()[0].slice(0, 4);
                    
                    let movedIndex = -1;
                    let newPoint: number[] | undefined;
                    
                    for (let i = 0; i < originalVertices.length; i++) {
                        const oldVertex = originalVertices[i];
                        const newVertexIndex = newVertices.findIndex(nv => nv[0] === oldVertex[0] && nv[1] === oldVertex[1]);
                        if (newVertexIndex === -1) {
                            movedIndex = i;
                            break;
                        }
                    }

                    if (movedIndex !== -1) {
                        newPoint = newVertices.find(nv => !originalVertices.some(ov => ov[0] === nv[0] && ov[1] === nv[1]));
                    }

                    if (movedIndex !== -1 && newPoint) {
                        const correctedCoords = RecalcularRectangulo(originalVertices, newPoint, movedIndex);
                        const newGeom = new Polygon(correctedCoords);
                        feature.setGeometry(newGeom);
                        pushToHistory(newGeom);
                    } else {
                        pushToHistory(finalGeometry.clone());
                    }

                    originalGeometryOnModifyStart.current = null;
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
                                    <p>Configuração de Vista do Mapa</p>
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
                                    <SelectTrigger className={cn("flex-1", selectedGeofenceId && !selectedGeofenceId.startsWith('new-shape-') && mode === 'editing' && !activeShapeState && "text-blue-600 border-blue-400 font-bold")}>
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
                                                <Button variant="ghost" size="icon" disabled={isBusy || defaultGeofenceId === selectedGeofenceId || !selectedGeofenceId} onClick={handleSetAsDefault}>
                                                    {isSettingDefault ? <Loader className="h-4 w-4 animate-spin"/> : <Star className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('condoDashboard.map.geofence.setAsDefault')}</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={startEditingSelected} disabled={!selectedGeofenceId || isBusy || !!activeShapeState}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('common.edit')}</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={!!activeShapeState?.feature || !selectedGeofenceId || isBusy}>
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
                                        <Button onClick={saveCurrentAction} disabled={isSaving || !activeShapeState?.feature?.getGeometry()}>
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
