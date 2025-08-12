
"use client";

import React, { useState, useEffect, useCallback, useActionState, useMemo } from 'react';
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
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Smartphone, Wifi, Map as MapIcon, Loader, Languages as LanguagesIcon, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getDeviceTypes, getLanguages, type DeviceType, type Language, createLanguage, updateLanguage, deleteLanguage } from '@/actions/catalogs';
import { CatalogManager } from './catalog-manager';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

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
    const { t } = useLocale();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isLangFormOpen, setIsLangFormOpen] = useState(false);
    const [editingLang, setEditingLang] = useState<Language | null>(null);
    
    const [isDeleting, startDeleteTransition] = React.useTransition();

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
    };

    const handleDelete = (id: string) => {
        startDeleteTransition(async () => {
            const result = await deleteLanguage(id);
             if (result?.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                fetchData();
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }
    
    const columns = useMemo(() => [
        { key: 'id', header: t('adminDashboard.settingsGroups.languages.table.key') },
        { key: 'name_es', header: t('adminDashboard.settingsGroups.languages.table.name_es') },
        { key: 'name_pt', header: t('adminDashboard.settingsGroups.languages.table.name_pt') },
        { key: 'actions', header: t('adminDashboard.table.actions') }
    ], [t]);


    if (isLoading) return <LoadingPlaceholder />;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('adminDashboard.settingsGroups.languages.title')}</CardTitle>
                        <CardDescription>{t('adminDashboard.settingsGroups.languages.description')}</CardDescription>
                    </div>
                     <Button size="sm" onClick={handleCreateLanguage}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('adminDashboard.settingsGroups.manageLanguages.addButton')}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table className="table-fixed w-full">
                            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead className="w-1/4 truncate">{columns[0].header}</TableHead>
                                    <TableHead className="w-1/4 truncate">{columns[1].header}</TableHead>
                                    <TableHead className="w-1/4 truncate">{columns[2].header}</TableHead>
                                    <TableHead className="w-auto min-w-[120px] text-right whitespace-nowrap">{columns[3].header}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(languages || []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No languages found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (languages || []).map(item => {
                                        const isDefault = item.id === 'es' || item.id === 'pt-BR';
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-mono text-xs truncate" title={item.id}>{item.id}</TableCell>
                                                <TableCell className="truncate" title={item.name_translations.es}>{item.name_translations.es}</TableCell>
                                                <TableCell className="truncate" title={item.name_translations['pt-BR']}>{item.name_translations['pt-BR']}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditLanguage(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isDefault}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                {t('adminDashboard.settingsGroups.languages.deleteConfirmation', {name: item.name_translations.es})}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(item.id)}>{t('common.delete')}</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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

    