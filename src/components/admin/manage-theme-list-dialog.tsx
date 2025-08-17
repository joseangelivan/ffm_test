
"use client";

import React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocale } from '@/lib/i18n';

export function ManageThemeListDialog() {
    const { t } = useLocale();
    // This is a placeholder for future functionality
    const mockThemes = [
        { id: 'light', name: `${t('dashboard.theme.light')} (${t('common.default')})` },
        { id: 'dark', name: `${t('dashboard.theme.dark')} (${t('common.default')})` },
    ];
    
    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{t('adminDashboard.settingsGroups.manageThemes.title')}</DialogTitle>
                <DialogDescription>
                    {t('adminDashboard.settingsGroups.manageThemes.description')}
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-lg">{t('adminDashboard.settingsGroups.manageThemes.availableThemes')}</h3>
                     <ScrollArea className="h-48 w-full rounded-md border p-2">
                        <div className="space-y-2">
                         {mockThemes.map(theme => (
                             <div key={theme.id} className="flex items-center justify-between rounded-md p-2 bg-muted/50">
                                <span className="text-sm font-medium">{theme.name}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                         ))}
                        </div>
                     </ScrollArea>
                      <Button variant="outline" disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('adminDashboard.settingsGroups.manageThemes.createButton')}
                    </Button>
                </div>
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-lg">{t('adminDashboard.settingsGroups.manageThemes.editorTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('adminDashboard.settingsGroups.manageThemes.editorDescription')}
                    </p>
                    <div className="h-48 w-full rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                        <span className="text-muted-foreground text-sm">{t('adminDashboard.settingsGroups.manageThemes.editorPlaceholder')}</span>
                    </div>
                     <Button disabled>{t('common.save')}</Button>
                </div>
            </div>
             <DialogFooter className="pt-6">
                <DialogClose asChild>
                    <Button type="button" variant="outline">{t('common.close')}</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}
