
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Palette } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ManageLanguageDialog } from './manage-language-dialog';
import { ManageThemeDialog } from './manage-theme-dialog';

export function ManageInterfaceDialog() {
    const { t } = useLocale();

    return (
        <Dialog>
             <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.settingsGroups.interface')}</span>
                </DropdownMenuItem>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.interface')}</DialogTitle>
                    <DialogDescription>
                        {t('adminDashboard.settingsGroups.interfaceDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="language" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="language">{t('dashboard.language')}</TabsTrigger>
                        <TabsTrigger value="theme">{t('dashboard.theme.title')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="language">
                       <ManageLanguageDialog />
                    </TabsContent>
                    <TabsContent value="theme">
                        <ManageThemeDialog />
                    </TabsContent>
                </Tabs>
                
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="mt-4 w-full">
                        {t('common.close')}
                    </Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    );
}
