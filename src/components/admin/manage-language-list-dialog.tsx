
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export function ManageLanguageListDialog() {
    const { t } = useLocale();
    // This is a placeholder for future functionality
    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{t('adminDashboard.settingsGroups.manageLanguages.title')}</DialogTitle>
                <DialogDescription>
                    {t('adminDashboard.settingsGroups.manageLanguages.description')}
                </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="add">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="add">{t('adminDashboard.settingsGroups.manageLanguages.addTab')}</TabsTrigger>
                    <TabsTrigger value="import">{t('adminDashboard.settingsGroups.manageLanguages.importTab')}</TabsTrigger>
                </TabsList>
                <TabsContent value="add" className="pt-4">
                     <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('adminDashboard.settingsGroups.manageLanguages.addDescription')}</p>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="lang-name">{t('adminDashboard.settingsGroups.manageLanguages.langName')}</Label>
                                <Input id="lang-name" placeholder="English" disabled />
                            </div>
                            <div>
                                <Label htmlFor="lang-key">{t('adminDashboard.settingsGroups.manageLanguages.langKey')}</Label>
                                <Input id="lang-key" placeholder="en" disabled/>
                            </div>
                        </div>
                     </div>
                </TabsContent>
                 <TabsContent value="import" className="pt-4">
                     <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('adminDashboard.settingsGroups.manageLanguages.importDescription')}</p>
                        <div>
                            <Label htmlFor="import-file">{t('adminDashboard.settingsGroups.manageLanguages.templateFile')}</Label>
                            <Input id="import-file" type="file" disabled/>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline">{t('common.close')}</Button>
                </DialogClose>
                <Button type="button" disabled>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('adminDashboard.settingsGroups.manageLanguages.saveButton')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
