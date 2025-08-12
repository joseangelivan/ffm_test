"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { getLanguages, type Language } from '@/actions/catalogs';
import { Skeleton } from '../ui/skeleton';


function DeviceTypesTab() {
    return (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground bg-muted/50 rounded-md">
            WIP: Device Types Management
        </div>
    )
}

function ProtocolsTab() {
     return (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground bg-muted/50 rounded-md">
            WIP: Communication Protocols Management
        </div>
    )
}

function MapsTab() {
     return (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground bg-muted/50 rounded-md">
            WIP: Maps Management
        </div>
    )
}


function LanguagesTab({ t }: { t: (key: string) => string }) {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getLanguages();
            setLanguages(data);
        } catch (error) {
            console.error("Failed to fetch languages:", error);
            setLanguages([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className="space-y-2 mt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }

    return (
        <LanguageManager 
            languages={languages} 
            onRefresh={fetchData} 
            t={t}
        />
    )
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
            <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.catalogs.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.settingsGroups.catalogs.description')}</DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-hidden">
                     <Tabs defaultValue="languages" className="h-full flex flex-col">
                        <TabsList className="flex-shrink-0">
                            <TabsTrigger value="languages" className="flex items-center gap-2"><Languages className="h-4 w-4"/>{t('adminDashboard.settingsGroups.languages.tab')}</TabsTrigger>
                            <TabsTrigger value="device_types" className="flex items-center gap-2"><HardDrive className="h-4 w-4"/>{t('adminDashboard.settingsGroups.deviceTypes.tab')}</TabsTrigger>
                            <TabsTrigger value="protocols" className="flex items-center gap-2" disabled>{t('adminDashboard.settingsGroups.protocols.tab')}</TabsTrigger>
                            <TabsTrigger value="maps" className="flex items-center gap-2" disabled><Map className="h-4 w-4"/>{t('adminDashboard.settingsGroups.maps.tab')}</TabsTrigger>
                        </TabsList>
                        <div className="flex-grow overflow-y-auto mt-4 pr-2">
                             <TabsContent value="languages">
                                <LanguagesTab t={t} />
                            </TabsContent>
                            <TabsContent value="device_types">
                                <DeviceTypesTab />
                            </TabsContent>
                            <TabsContent value="protocols">
                               <ProtocolsTab />
                            </TabsContent>
                             <TabsContent value="maps">
                                <MapsTab />
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
