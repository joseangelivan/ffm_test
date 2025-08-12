
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Smartphone, Wifi, Map as MapIcon, Loader, Languages } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDeviceTypes, type DeviceType } from '@/actions/catalogs';
import { CatalogManager } from './catalog-manager';
import { supportedLanguages } from '@/lib/languages';


function LanguageCatalog() {
    const { t } = useLocale();

    return (
        <Card className="border-dashed">
            <CardHeader>
                <CardTitle>{t('adminDashboard.settingsGroups.catalogs.languages.title')}</CardTitle>
                <CardDescription>{t('adminDashboard.settingsGroups.catalogs.languages.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50">
                            <TableRow>
                                <TableHead>{t('adminDashboard.settingsGroups.catalogs.languages.table.key')}</TableHead>
                                <TableHead>{t('adminDashboard.settingsGroups.catalogs.languages.table.name_es')}</TableHead>
                                <TableHead>{t('adminDashboard.settingsGroups.catalogs.languages.table.name_pt')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(supportedLanguages).map(([key, names]) => (
                                <TableRow key={key}>
                                    <TableCell className="font-mono text-xs">{key}</TableCell>
                                    <TableCell>{names.es}</TableCell>
                                    <TableCell>{names['pt-BR']}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}


export function ManageCatalogsDialog() {
    const { t } = useLocale();
    const [isLoading, setIsLoading] = useState(true);
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);

    const fetchDeviceTypes = async () => {
        setIsLoading(true);
        const data = await getDeviceTypes();
        setDeviceTypes(data);
        setIsLoading(false);
    };

    return (
        <Dialog onOpenChange={(open) => { if(open) fetchDeviceTypes() }}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Book className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.settingsGroups.catalogs.title')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.catalogs.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.settingsGroups.catalogs.description')}</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="devices" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="devices"><Smartphone className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.deviceTypes.tab')}</TabsTrigger>
                        <TabsTrigger value="protocols"><Wifi className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.protocols.tab')}</TabsTrigger>
                        <TabsTrigger value="languages"><Languages className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.languages.tab')}</TabsTrigger>
                        <TabsTrigger value="maps" disabled><MapIcon className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.maps.tab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="devices" className="mt-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48"><Loader className="h-8 w-8 animate-spin"/></div>
                        ) : (
                            <CatalogManager
                                title={t('adminDashboard.settingsGroups.catalogs.deviceTypes.title')}
                                data={deviceTypes}
                                columns={{
                                    name_translations: t('adminDashboard.settingsGroups.catalogs.table.name'),
                                    features_translations: t('adminDashboard.settingsGroups.catalogs.table.features'),
                                }}
                                onRefresh={fetchDeviceTypes}
                            />
                        )}
                    </TabsContent>
                     <TabsContent value="protocols" className="mt-4">
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>{t('adminDashboard.settingsGroups.catalogs.protocols.title')}</CardTitle>
                                <CardDescription>{t('adminDashboard.settingsGroups.catalogs.wipDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48 w-full rounded-md border-dashed flex items-center justify-center bg-muted/30">
                                    <span className="text-muted-foreground text-sm">{t('adminDashboard.settingsGroups.manageThemes.editorPlaceholder')}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="languages" className="mt-4">
                        <LanguageCatalog />
                    </TabsContent>
                    <TabsContent value="maps" className="mt-4">
                       <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>{t('adminDashboard.settingsGroups.catalogs.maps.title')}</CardTitle>
                                <CardDescription>{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyMissing')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center text-center p-4">
                                    <p className="text-sm text-muted-foreground">{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyInstructions')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="mt-4">
                            {t('common.close')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
