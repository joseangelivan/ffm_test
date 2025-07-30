
"use client";

import React, { useState } from 'react';
import {
  PlusCircle,
  Settings,
  Home,
  Building2,
  Square,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ManageElementTypeDialog } from './manage-element-type-dialog';

type MapElementType = 'camera' | 'gatehouse' | 'housing_area' | 'other';

export function ElementsControls() {
    const { t } = useLocale();
    const [isElementEditing, setIsElementEditing] = useState(false);
    const [selectedElementType, setSelectedElementType] = useState<MapElementType>('camera');

    return (
        <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('condoDashboard.map.elements.title')}</h3>
                <p className="text-sm text-muted-foreground">
                    {t('condoDashboard.map.elements.description')}
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Checkbox 
                        id="enable-element-editing" 
                        checked={isElementEditing} 
                        onCheckedChange={(checked) => setIsElementEditing(!!checked)}
                    />
                    <label 
                        htmlFor="enable-element-editing" 
                        className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        {t('condoDashboard.map.elements.editMode')}
                    </label>
                </div>

                <fieldset disabled={!isElementEditing} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="element-type">{t('condoDashboard.map.elements.elementTypeLabel')}</Label>
                        <div className="flex items-center gap-2">
                            <Select value={selectedElementType} onValueChange={(v) => setSelectedElementType(v as MapElementType)}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder={t('condoDashboard.map.elements.selectTypePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="camera">
                                        <div className="flex items-center gap-2"><Video className="h-4 w-4" />Cámara de Vigilancia</div>
                                    </SelectItem>
                                    <SelectItem value="gatehouse">
                                        <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />Portería / Garita</div>
                                    </SelectItem>
                                    <SelectItem value="housing_area">
                                        <div className="flex items-center gap-2"><Home className="h-4 w-4" />Área de Vivienda</div>
                                    </SelectItem>
                                    <SelectItem value="other">
                                        <div className="flex items-center gap-2"><Square className="h-4 w-4" />Otro</div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Settings className="h-4 w-4"/>
                                    </Button>
                                </DialogTrigger>
                                <ManageElementTypeDialog />
                            </Dialog>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            {selectedElementType === 'housing_area' ? t('condoDashboard.map.elements.drawArea') : t('condoDashboard.map.elements.addElement')}
                        </Button>
                        <Button variant="secondary">
                            <Settings className="h-4 w-4 mr-2" />
                            {t('adminDashboard.table.manage')}
                        </Button>
                    </div>
                </fieldset>
            </div>
        </div>
    );
}
