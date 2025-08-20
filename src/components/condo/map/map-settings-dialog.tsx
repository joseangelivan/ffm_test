
"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocale } from '@/lib/i18n';
import { Frame, ZoomIn, ZoomOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface MapSettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    zoomLevel: number;
    initialFitLevel: '1' | '2' | '3';
    onFitLevelChange: (level: '1' | '2' | '3') => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onApplyFit: (level: '1' | '2' | '3') => void;
    isGeofenceAvailable: boolean;
}

export function MapSettingsDialog({
    isOpen,
    onOpenChange,
    zoomLevel,
    initialFitLevel,
    onFitLevelChange,
    onZoomIn,
    onZoomOut,
    onApplyFit,
    isGeofenceAvailable
}: MapSettingsDialogProps) {
    const { t } = useLocale();
    const [selectedFitLevel, setSelectedFitLevel] = useState(initialFitLevel);

    useEffect(() => {
        if (isOpen) {
            setSelectedFitLevel(initialFitLevel);
        }
    }, [isOpen, initialFitLevel]);

    const handleApplyAndClose = () => {
        onFitLevelChange(selectedFitLevel);
        onApplyFit(selectedFitLevel);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('condoDashboard.map.settings.title')}</DialogTitle>
                    <DialogDescription>{t('condoDashboard.map.settings.description')}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                     <div className="space-y-3">
                        <Label>{t('condoDashboard.map.settings.manualZoom')}</Label>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Button onClick={onZoomOut} variant="outline" size="icon">
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <span className="text-lg font-bold text-primary w-12 text-center select-none">{zoomLevel}</span>
                             <Button onClick={onZoomIn} variant="outline" size="icon">
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    
                    <Separator />

                    <fieldset className="space-y-3" disabled={!isGeofenceAvailable}>
                        <div className="space-y-1">
                            <Label>{t('condoDashboard.map.settings.autoFitTitle')}</Label>
                            <p className="text-xs text-muted-foreground">
                               {!isGeofenceAvailable 
                                    ? t('condoDashboard.map.settings.noGeofence')
                                    : t('condoDashboard.map.settings.zoomLevelDescription')
                               }
                            </p>
                        </div>
                        
                        <RadioGroup value={selectedFitLevel} onValueChange={(v) => setSelectedFitLevel(v as '1' | '2' | '3')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1" id="level-1" />
                                <Label htmlFor="level-1">{t('condoDashboard.map.settings.fitLevels.tight')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="2" id="level-2" />
                                <Label htmlFor="level-2">{t('condoDashboard.map.settings.fitLevels.normal')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="3" id="level-3" />
                                <Label htmlFor="level-3">{t('condoDashboard.map.settings.fitLevels.wide')}</Label>
                            </div>
                        </RadioGroup>

                         <Button onClick={handleApplyAndClose} className="w-full">
                            <Frame className="h-4 w-4 mr-2" />
                            {t('condoDashboard.map.settings.applyAutoFit')}
                        </Button>
                    </fieldset>
                </div>
                <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="outline" className="w-full">
                           {t('common.close')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
