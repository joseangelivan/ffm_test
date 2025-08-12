"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Book, HardDrive, Languages, Map } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LanguageManager } from './language-manager';
import { DeviceTypesManager } from './device-types-manager';


export function ManageCatalogsDialog() {
    const { t } = useLocale();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Book className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.settingsGroups.catalogs.title')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.catalogs.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.settingsGroups.catalogs.description')}</DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-hidden">
                     <Tabs defaultValue="languages" className="h-full flex flex-col">
                        <TabsList className="flex-shrink-0 flex flex-wrap h-auto justify-start">
                            <TabsTrigger value="languages" className="flex items-center gap-2"><Languages className="h-4 w-4"/>{t('adminDashboard.settingsGroups.catalogs.languages.tab')}</TabsTrigger>
                            <TabsTrigger value="device_types" className="flex items-center gap-2"><HardDrive className="h-4 w-4"/>{t('adminDashboard.settingsGroups.catalogs.deviceTypes.tab')}</TabsTrigger>
                            <TabsTrigger value="protocols" className="flex items-center gap-2" disabled>{t('adminDashboard.settingsGroups.catalogs.protocols.tab')}</TabsTrigger>
                            <TabsTrigger value="maps" className="flex items-center gap-2" disabled>{t('adminDashboard.settingsGroups.catalogs.maps.tab')}</TabsTrigger>
                        </TabsList>
                        <div className="flex-grow overflow-y-auto mt-4 pr-2">
                             <TabsContent value="languages">
                                <LanguageManager t={t} />
                            </TabsContent>
                            <TabsContent value="device_types">
                                <DeviceTypesManager t={t} />
                            </TabsContent>
                            <TabsContent value="protocols">
                               <div className="flex items-center justify-center h-40 text-sm text-muted-foreground bg-muted/50 rounded-md">
                                    {t('adminDashboard.settingsGroups.catalogs.wipDescription')}
                                </div>
                            </TabsContent>
                             <TabsContent value="maps">
                                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground bg-muted/50 rounded-md">
                                    {t('adminDashboard.settingsGroups.catalogs.wipDescription')}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="flex-shrink-0 pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            {t('common.close')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
