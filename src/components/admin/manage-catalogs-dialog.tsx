
"use client";

import React, { useState, useEffect, useCallback, useActionState } from 'react';
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
import { useFormStatus } from 'react-dom';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Smartphone, Wifi, Map as MapIcon, Loader, Languages as LanguagesIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getDeviceTypes, getLanguages, type DeviceType, type Language, createLanguage, updateLanguage } from '@/actions/catalogs';
import { CatalogManager } from './catalog-manager';
import { LanguageManager } from './language-manager';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function LanguageForm({
    item,
    onSuccess,
    onCancel,
}: {
    item: Language | null;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!item;
    const formAction = isEditMode ? updateLanguage : createLanguage;

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result?.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    }
    
    const [state, dispatch] = useActionState(handleAction, undefined);
    const { pending } = useFormStatus();

    return (
        <DialogContent>
            <form action={dispatch}>
                 {pending && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                        <Loader className="h-8 w-8 animate-spin" />
                        <span className="ml-2">{isEditMode ? 'Actualizando...' : 'Creando...'}</span>
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? t('adminDashboard.settingsGroups.languages.editTitle') : t('adminDashboard.settingsGroups.languages.createTitle')}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <input type="hidden" name="id" value={item?.id || ''} />
                    <div className="space-y-2">
                        <Label htmlFor="id-lang">{t('adminDashboard.settingsGroups.languages.table.key')}</Label>
                        <Input id="id-lang" name="id" defaultValue={item?.id || ''} required disabled={isEditMode} placeholder="ej. en-US" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_es">{t('adminDashboard.settingsGroups.languages.table.name_es')}</Label>
                        <Input id="name_es" name="name_es" defaultValue={item?.name_translations.es} required placeholder="Inglés (EE.UU.)" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_pt">{t('adminDashboard.settingsGroups.languages.table.name_pt')}</Label>
                        <Input id="name_pt" name="name_pt" defaultValue={item?.name_translations['pt-BR']} required placeholder="Inglês (EUA)" />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button type="submit">{t('common.save')}</Button>
                </div>
            </form>
        </DialogContent>
    )
}

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

    const onLangFormSuccess = () => {
        setIsLangFormOpen(false);
        setEditingLang(null);
        fetchData();
    }

    if (isLoading) return <LoadingPlaceholder />;

    return (
        <>
            <LanguageManager
                languages={languages}
                onRefresh={fetchData}
                onEdit={handleEditLanguage}
                onCreate={handleCreateLanguage}
            />
             <Dialog open={isLangFormOpen} onOpenChange={setIsLangFormOpen}>
                 <LanguageForm 
                    item={editingLang}
                    onSuccess={onLangFormSuccess}
                    onCancel={() => setIsLangFormOpen(false)}
                 />
            </Dialog>
        </>
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
                <div className="flex-grow overflow-hidden">
                    <Tabs defaultValue="devices" className="w-full h-full flex flex-col">
                        <TabsList className="flex flex-wrap h-auto">
                            <TabsTrigger value="devices" className="flex-1"><Smartphone className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.deviceTypes.tab')}</TabsTrigger>
                            <TabsTrigger value="languages" className="flex-1"><LanguagesIcon className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.languages.tab')}</TabsTrigger>
                            <TabsTrigger value="protocols" className="flex-1"><Wifi className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.protocols.tab')}</TabsTrigger>
                            <TabsTrigger value="maps" className="flex-1" disabled><MapIcon className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.maps.tab')}</TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-4 flex-grow overflow-y-auto">
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
