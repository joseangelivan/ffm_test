
"use client";

import React from 'react';
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
    fitLevel: string;
    onFitLevelChange: (level: '1' | '2' | '3') => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitBounds: () => void;
}

export function MapSettingsDialog({
    isOpen,
    onOpenChange,
    zoomLevel,
    fitLevel,
    onFitLevelChange,
    onZoomIn,
    onZoomOut,
    onFitBounds,
}: MapSettingsDialogProps) {
    const { t } = useLocale();

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

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>{t('condoDashboard.map.settings.autoFitTitle')}</Label>
                            <p className="text-xs text-muted-foreground">
                               {t('condoDashboard.map.settings.zoomLevelDescription')}
                            </p>
                        </div>
                        
                        <RadioGroup value={fitLevel} onValueChange={(v) => onFitLevelChange(v as '1' | '2' | '3')}>
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

                         <Button onClick={onFitBounds} className="w-full">
                            <Frame className="h-4 w-4 mr-2" />
                            {t('condoDashboard.map.settings.applyAutoFit')}
                        </Button>
                    </div>
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
