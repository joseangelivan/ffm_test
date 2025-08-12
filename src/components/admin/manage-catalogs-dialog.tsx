"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Smartphone, Wifi, Map as MapIcon, Loader } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getDeviceTypes, getLanguages, type DeviceType, type Language } from '@/actions/catalogs';
import { CatalogManager } from './catalog-manager';
import { LanguageManager } from './language-manager';


function LoadingPlaceholder() {
    return (
        <div className="flex justify-center items-center h-48"><Loader className="h-8 w-8 animate-spin"/></div>
    )
}

function DeviceTypesTab() {
    const { t } = useLocale();
    const [isLoading, setIsLoading] = useState(true);
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await getDeviceTypes();
        setDeviceTypes(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) return <LoadingPlaceholder />;

    return (
        <CatalogManager
            title={t('adminDashboard.settingsGroups.catalogs.deviceTypes.title')}
            data={deviceTypes}
            onRefresh={fetchData}
        />
    )
}

function LanguagesTab() {
    const [isLoading, setIsLoading] = useState(true);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isLangFormOpen, setIsLangFormOpen] = useState(false);
    const [editingLang, setEditingLang] = useState<Language | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await getLanguages();
        setLanguages(data || []);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateLanguage = () => {
        setEditingLang(null);
        setIsLangFormOpen(true);
    };

    const handleEditLanguage = (lang: Language) => {
        setEditingLang(lang);
        setIsLangFormOpen(true);
    };

    if (isLoading) return <LoadingPlaceholder />;

    return (
        <LanguageManager
            languages={languages}
            onRefresh={fetchData}
            onEdit={handleEditLanguage}
            onCreate={handleCreateLanguage}
            isFormOpen={isLangFormOpen}
            setIsFormOpen={setIsLangFormOpen}
            editingItem={editingLang}
        />
    );
}

export function ManageCatalogsDialog() {
    const { t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Book className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.settingsGroups.catalogs.title')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl flex flex-col h-full max-h-[90svh]">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.catalogs.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.settingsGroups.catalogs.description')}</DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col overflow-hidden">
                    <Tabs defaultValue="devices" className="w-full h-full flex flex-col">
                        <TabsList className="flex flex-wrap h-auto shrink-0">
                            <TabsTrigger value="devices" className="flex-1"><Smartphone className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.deviceTypes.tab')}</TabsTrigger>
                            <TabsTrigger value="languages" className="flex-1"><Loader className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.languages.tab')}</TabsTrigger>
                            <TabsTrigger value="protocols" className="flex-1"><Wifi className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.protocols.tab')}</TabsTrigger>
                            <TabsTrigger value="maps" className="flex-1" disabled><MapIcon className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.maps.tab')}</TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-4 flex-grow overflow-y-auto p-1">
                            <TabsContent value="devices">
                                <DeviceTypesTab />
                            </TabsContent>
                            
                            <TabsContent value="languages">
                               <LanguagesTab />
                            </TabsContent>
                            
                            <TabsContent value="protocols">
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
    )
}
