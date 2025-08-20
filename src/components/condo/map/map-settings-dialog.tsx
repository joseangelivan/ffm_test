
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
import { Slider } from '@/components/ui/slider';
import { useLocale } from '@/lib/i18n';
import { Frame, ZoomIn, ZoomOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface MapSettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    zoomLevel: number;
    fitPadding: number;
    onFitPaddingChange: (padding: number) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitBounds: () => void;
}

export function MapSettingsDialog({
    isOpen,
    onOpenChange,
    zoomLevel,
    fitPadding,
    onFitPaddingChange,
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
                               {t('condoDashboard.map.settings.paddingDescription')}
                            </p>
                        </div>

                        <div className="space-y-2">
                             <div className="flex justify-between items-center mb-1">
                                <Label htmlFor="padding-slider">{t('condoDashboard.map.settings.autoFitPadding')}</Label>
                                <span className="text-sm text-muted-foreground">{fitPadding}%</span>
                            </div>
                            <Slider
                                id="padding-slider"
                                min={0}
                                max={50}
                                step={1}
                                value={[fitPadding]}
                                onValueChange={(value) => onFitPaddingChange(value[0])}
                            />
                        </div>
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
