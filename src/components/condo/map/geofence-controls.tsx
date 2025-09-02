

"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
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
import type { Geometry, Polygon, SimpleGeometry } from 'ol/geom';


const puntoEstaDentro = (poligono: Polygon, punto: number[]): boolean => {
    return poligono.intersectsCoordinate(punto);
}

const RecalcularRectangulo = (verticesOriginales: number[][], verticeMovido: number[], indiceMovido: number) => {
  const estaDentro = puntoEstaDentro(new (require('ol/geom/Polygon').default)([verticesOriginales]), verticeMovido);

  if (estaDentro) {
    // Caso 2: Vértice se mueve hacia adentro
    const verticeAdyacente1 = verticesOriginales[(indiceMovido + 3) % 4];
    const verticeAdyacente2 = verticesOriginales[(indiceMovido + 1) % 4];

    // Proyectar el punto movido sobre los lados opuestos para encontrar el nuevo vértice opuesto
    const nuevoOpuestoX = verticeAdyacente1[0] === verticesOriginales[indiceMovido][0] ? verticeAdyacente2[0] : verticeAdyacente1[0];
    const nuevoOpuestoY = verticeAdyacente1[1] === verticesOriginales[indiceMovido][1] ? verticeAdyacente2[1] : verticeAdyacente1[1];
    
    const nuevoVerticeOpuesto = [
        (nuevoOpuestoX - verticeMovido[0]) + verticeMovido[0],
        (nuevoOpuestoY - verticeMovido[1]) + verticeMovido[1]
    ];
    
    const nuevoRectangulo = new Array(4);
    nuevoRectangulo[indiceMovido] = verticeMovido;
    nuevoRectangulo[(indiceMovido + 2) % 4] = nuevoVerticeOpuesto;
    nuevoRectangulo[(indiceMovido + 1) % 4] = [nuevoVerticeOpuesto[0], verticeMovido[1]];
    nuevoRectangulo[(indiceMovido + 3) % 4] = [verticeMovido[0], nuevoVerticeOpuesto[1]];
    
    return [...nuevoRectangulo, nuevoRectangulo[0]];

  } else {
    // Caso 1: Vértice se mueve hacia afuera (usa bounding box)
    const tempVertices = [...verticesOriginales];
    tempVertices[indiceMovido] = verticeMovido;
    
    const xs = tempVertices.map(v => v[0]);
    const ys = tempVertices.map(v => v[1]);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const rectanguloPerfecto = [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY]
    ];
    
    return [...rectanguloPerfecto, rectanguloPerfecto[0]];
  }
};


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
    setDebugInfo: React.Dispatch<React.SetStateAction<string>>;
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
    setDebugInfo,
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
    
    const geofenceSourceRef = (): VectorSource | null => {
        const layer = mapRef.current?.getLayers().getArray().find(l => l.get('id') === 'geofence-layer');
        return (layer as any)?.getSource() || null;
    }

    const pushToHistory = useCallback((geometry: Geometry) => {
        setHistoryStack(prev => {
            const newStack = prev.slice(0, historyIndex + 1);
            newStack.push(geometry.clone());
            setHistoryIndex(newStack.length - 1);
            return newStack;
        });
    }, [historyIndex, setHistoryIndex, setHistoryStack]);

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

    const removeInteractions = useCallback(() => {
        if (!mapRef.current) return;
        if (drawingInteractionRef.current) mapRef.current.removeInteraction(drawingInteractionRef.current);
        if (modifyInteractionRef.current) mapRef.current.removeInteraction(modifyInteractionRef.current);
        if (translateInteractionRef.current) mapRef.current.removeInteraction(translateInteractionRef.current);
        drawingInteractionRef.current = null;
        modifyInteractionRef.current = null;
        translateInteractionRef.current = null;
    }, [mapRef, drawingInteractionRef, modifyInteractionRef, translateInteractionRef]);

    const cancelCurrentAction = useCallback(() => {
        const source = geofenceSourceRef();
        if (activeShapeState?.feature) {
             const feature = activeShapeState.feature;
             const originalGeometry = activeShapeState.originalGeometry;
             if (originalGeometry && feature) {
                const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
                const olGeom = format.readGeometry(originalGeometry);
                if (olGeom) feature.setGeometry(olGeom);
             } else if (feature.getId()?.toString().startsWith('new-shape-')) {
                source?.removeFeature(feature);
             }
        }
        
        removeInteractions();
        setMode('view');
        setActiveShapeState(null);
        setCurrentGeofenceName('');
        setIsDrawing(false);
        setHistoryStack([]);
        setHistoryIndex(-1);
    }, [activeShapeState, removeInteractions, setActiveShapeState, setMode, geofenceSourceRef, setHistoryStack, setHistoryIndex]);
    
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
        setMode('editing');
        
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
            if (drawingMode === 'Rectangle') {
                newFeature.set('geometryType', 'Rectangle');
            }
            const newId = `new-shape-${Date.now()}`;
            newFeature.setId(newId);
            
            map.removeInteraction(newInteraction);
            drawingInteractionRef.current = null;
            
            const Collection = require('ol/Collection').default;
            const features = new Collection([newFeature]);
            
            const modifyInteraction = new Modify({ features, insertVertexCondition: () => false });
            modifyInteractionRef.current = modifyInteraction;
            map.addInteraction(modifyInteraction);

            modifyInteraction.on('modifyend', (e) => {
                const feature = e.features.getArray()[0];
                if (feature) pushToHistory(feature.getGeometry()!);
            });
            
            const translateInteraction = new Translate({ features: features });
            translateInteractionRef.current = translateInteraction;
            map.addInteraction(translateInteraction);

            translateInteraction.on('translateend', (e) => {
                const feature = e.features.getArray()[0];
                if (feature) pushToHistory(feature.getGeometry()!);
            });
            
            const placeholderGeofence: DbGeofence = {
                id: newId,
                condominium_id: condoId,
                name: getNextGeofenceName(),
                geometry: null, 
                is_default: false,
            };

            setGeofences(current => [...current, placeholderGeofence]);
            setSelectedGeofenceId(newId);
            setCurrentGeofenceName(placeholderGeofence.name);
            setActiveShapeState({ id: newId, feature: newFeature, originalGeometry: null });
            setIsDrawing(false);
            const initialGeom = newFeature.getGeometry();
            if (initialGeom) {
                setHistoryStack([initialGeom.clone()]);
                setHistoryIndex(0);
            }
        });

        map.addInteraction(newInteraction);
        setIsDrawing(true);
        setCurrentGeofenceName(getNextGeofenceName());
    };
    
    const startEditingSelected = useCallback(() => {
        const source = geofenceSourceRef();
        const map = mapRef.current;
        if (!selectedGeofenceId || !source || !map) return;

        const featureToEdit = source.getFeatureById(selectedGeofenceId) as Feature<Polygon>;
        const selectedGeofence = geofences.find(g => g.id === selectedGeofenceId);

        if (!selectedGeofence || !featureToEdit) return;

        cancelCurrentAction();
        setMode('editing');
        
        setActiveShapeState({
            id: selectedGeofenceId,
            feature: featureToEdit,
            originalGeometry: selectedGeofence.geometry,
        });
        setCurrentGeofenceName(selectedGeofence.name);
        
        const initialGeom = featureToEdit.getGeometry();
        if (initialGeom) {
            setHistoryStack([initialGeom.clone()]);
            setHistoryIndex(0);
        }
    }, [geofences, selectedGeofenceId, cancelCurrentAction, setMode, setActiveShapeState, setHistoryStack, setHistoryIndex, mapRef]);

    useEffect(() => {
        const map = mapRef.current;
        if (!activeShapeState || !map) {
            removeInteractions();
            return;
        }

        const featureToEdit = activeShapeState.feature;
        if (!featureToEdit) return;
        
        const Collection = require('ol/Collection').default;
        const features = new Collection([featureToEdit]);

        const modifyInteraction = new Modify({ features, insertVertexCondition: () => false });
        map.addInteraction(modifyInteraction);
        modifyInteractionRef.current = modifyInteraction;

        let originalCoords: number[][] | null = null;
        const modifyStartKey = modifyInteraction.on('modifystart', (event: any) => {
            const feature = event.features.getArray()[0] as Feature<Polygon>;
            if (feature.get('geometryType') === 'Rectangle') {
                originalCoords = feature.getGeometry()!.getCoordinates()[0].map(c => [...c]);
                if (originalCoords.length === 5) originalCoords.pop();
            }
        });
        
        const modifyEndKey = modifyInteraction.on('modifyend', (event: any) => {
            const feature = event.features.getArray()[0] as Feature<Polygon>;
            if (!feature) return;

            if (feature.get('geometryType') === 'Rectangle' && originalCoords) {
                const currentCoords = feature.getGeometry()!.getCoordinates()[0];
                let movedIndex = -1;
                for (let i = 0; i < originalCoords.length; i++) {
                    if (originalCoords[i][0] !== currentCoords[i][0] || originalCoords[i][1] !== currentCoords[i][1]) {
                        movedIndex = i;
                        break;
                    }
                }
        
                if (movedIndex !== -1) {
                    try {
                        const verticeMovido = currentCoords[movedIndex];
                        const correctedCoords = RecalcularRectangulo(originalCoords, verticeMovido, movedIndex);
                        feature.getGeometry()!.setCoordinates([correctedCoords]);
                    } catch(e: any) {
                        setDebugInfo(`Error: ${e.message}`);
                    }
                }
            }
            
            const finalGeom = feature.getGeometry()!;
            const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
            setDebugInfo(`¡Cambio guardado en el historial! Coords: ${JSON.stringify(format.writeGeometryObject(finalGeom), null, 2)}`);
            pushToHistory(finalGeom);
        });

        const translateInteraction = new Translate({ features: features });
        map.addInteraction(translateInteraction);
        translateInteractionRef.current = translateInteraction;

        const translateEndKey = translateInteraction.on('translateend', (e) => {
            const feature = e.features.getArray()[0];
            if (feature) pushToHistory(feature.getGeometry()!);
        });

        return () => {
            if (map) {
                map.removeInteraction(modifyInteraction);
                map.removeInteraction(translateInteraction);
            }
            // Unsubscribe from events
            const unByKey = require('ol/Observable').unByKey;
            unByKey(modifyStartKey);
            unByKey(modifyEndKey);
            unByKey(translateEndKey);
        };
    }, [activeShapeState, mapRef, pushToHistory, setDebugInfo]);


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
                                } else {
                                    setMode('editing');
                                }
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
