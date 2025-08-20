
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

interface MapSettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    zoomLevel: number;
    fitPadding: number;
    onFitPaddingChange: (padding: number) => void;
}

export function MapSettingsDialog({
    isOpen,
    onOpenChange,
    zoomLevel,
    fitPadding,
    onFitPaddingChange,
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
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label>{t('condoDashboard.map.settings.currentZoom')}</Label>
                        <span className="text-lg font-bold text-primary">{zoomLevel}</span>
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
                         <p className="text-xs text-muted-foreground pt-1">
                            {t('condoDashboard.map.settings.paddingDescription')}
                        </p>
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
