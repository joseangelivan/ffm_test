
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Smartphone, Wifi, Map as MapIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

function PlaceholderTab({ title }: { title: string }) {
    const { t } = useLocale();
    return (
        <Card className="mt-4 border-dashed">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{t('adminDashboard.settingsGroups.catalogs.wipDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-48 w-full rounded-md border-dashed flex items-center justify-center bg-muted/30">
                    <span className="text-muted-foreground text-sm">{t('adminDashboard.settingsGroups.manageThemes.editorPlaceholder')}</span>
                </div>
            </CardContent>
        </Card>
    );
}

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
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.catalogs.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.settingsGroups.catalogsDescription')}</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="devices" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="devices"><Smartphone className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.deviceTypes.tab')}</TabsTrigger>
                        <TabsTrigger value="protocols"><Wifi className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.protocols.tab')}</TabsTrigger>
                        <TabsTrigger value="maps" disabled><MapIcon className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.maps.tab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="devices">
                        <PlaceholderTab title={t('adminDashboard.settingsGroups.catalogs.deviceTypes.title')} />
                    </TabsContent>
                     <TabsContent value="protocols">
                        <PlaceholderTab title={t('adminDashboard.settingsGroups.catalogs.protocols.title')} />
                    </TabsContent>
                    <TabsContent value="maps">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>{t('adminDashboard.settingsGroups.catalogs.maps.title')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center text-center p-4">
                                    <p className="text-sm text-muted-foreground">{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyInstructions')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="mt-4 w-full">
                        {t('common.close')}
                    </Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    )
}
