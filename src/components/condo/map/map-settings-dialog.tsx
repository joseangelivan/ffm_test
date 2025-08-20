
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
    fitPadding: { x: number; y: number };
    onFitPaddingChange: (padding: { x: number; y: number }) => void;
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
                        <h4 className="font-medium text-sm">{t('condoDashboard.map.settings.autoFitPadding')}</h4>
                         <div className="space-y-4 pt-2">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="padding-x">{t('condoDashboard.map.settings.paddingX')}</Label>
                                    <span className="text-sm text-muted-foreground">{fitPadding.x}%</span>
                                </div>
                                <Slider
                                    id="padding-x"
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={[fitPadding.x]}
                                    onValueChange={(value) => onFitPaddingChange({ ...fitPadding, x: value[0] })}
                                />
                            </div>
                             <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="padding-y">{t('condoDashboard.map.settings.paddingY')}</Label>
                                    <span className="text-sm text-muted-foreground">{fitPadding.y}%</span>
                                </div>
                                <Slider
                                    id="padding-y"
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={[fitPadding.y]}
                                    onValueChange={(value) => onFitPaddingChange({ ...fitPadding, y: value[0] })}
                                />
                            </div>
                        </div>
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
