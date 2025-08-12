"use client";

import React, { useState, useMemo, useCallback, useEffect, useActionState, useTransition, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle, Languages, Loader } from 'lucide-react';
import { getLanguages, createLanguage, updateLanguage, deleteLanguage, type Language, type TranslationObject } from '@/actions/catalogs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { translateTextAction } from '@/actions/translation';
import { useFormStatus } from 'react-dom';
import { ScrollArea } from '../ui/scroll-area';

function LanguageForm({ item, onSuccess, onCancel }: { item: Language | null, onSuccess: () => void, onCancel: () => void }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!item;
    const formAction = isEditMode ? updateLanguage : createLanguage;

    const [selectedLang, setSelectedLang] = useState<'es' | 'pt-BR'>('pt-BR');
    const nameEsRef = useRef<HTMLInputElement>(null);
    const namePtRef = useRef<HTMLInputElement>(null);

    const [isTranslating, startTranslateTransition] = useTransition();

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result?.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    };
    
    const [state, dispatch] = useActionState(handleAction, undefined);
    const { pending } = useFormStatus();

     const handleTranslate = () => {
        startTranslateTransition(async () => {
            const sourceLang = selectedLang === 'pt-BR' ? 'pt' : 'es';
            const targetLang = selectedLang === 'pt-BR' ? 'es' : 'pt';

            const nameRef = sourceLang === 'es' ? nameEsRef : namePtRef;
            const targetNameRef = targetLang === 'es' ? nameEsRef : namePtRef;

            const nameToTranslate = nameRef.current?.value || '';

            try {
                const nameResult = await translateTextAction({ text: nameToTranslate, sourceLang, targetLang });
                if (nameResult.success && nameResult.data && targetNameRef.current) {
                    targetNameRef.current.value = nameResult.data;
                } else if (!nameResult.success) {
                     toast({ title: t('toast.errorTitle'), description: nameResult.message, variant: 'destructive' });
                }
            } catch (error) {
                 toast({ title: t('toast.errorTitle'), description: t('toast.adminLogin.serverError'), variant: 'destructive' });
            }
        });
    }

    return (
        <DialogContent>
            <form action={dispatch}>
                 {(pending || isTranslating) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                        <Loader className="h-8 w-8 animate-spin" />
                        <span className="ml-2">{isTranslating ? t('adminDashboard.settingsGroups.catalogs.form.translating') : (isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating'))}</span>
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? t('adminDashboard.settingsGroups.catalogs.languages.editTitle') : t('adminDashboard.settingsGroups.catalogs.languages.createTitle')}
                    </DialogTitle>
                </DialogHeader>
                 <input type="hidden" name="id" value={item?.id || ''} />
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">{t('adminDashboard.settingsGroups.catalogs.languages.table.key')}</Label>
                        <Input id="id" name="id" defaultValue={item?.id} required disabled={isEditMode || pending}/>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        <div className="space-y-2 flex-grow">
                            <Label>{t('dashboard.language')}</Label>
                            <Select value={selectedLang} onValueChange={(value) => setSelectedLang(value as 'es' | 'pt-BR')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar idioma"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es">{t('adminDashboard.settingsGroups.catalogs.form.tab_es')}</SelectItem>
                                    <SelectItem value="pt-BR">{t('adminDashboard.settingsGroups.catalogs.form.tab_pt')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-6">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button type="button" variant="outline" size="icon" onClick={handleTranslate} disabled={pending || isTranslating}>
                                            <Languages className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('adminDashboard.settingsGroups.catalogs.form.translateTooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    
                    <div className={`${selectedLang === 'es' ? 'block' : 'hidden'}`}>
                         <div className="space-y-2">
                            <Label htmlFor="name_es">{t('adminDashboard.settingsGroups.catalogs.languages.table.name')}</Label>
                            <Input ref={nameEsRef} id="name_es" name="name_es" defaultValue={item?.name_translations?.es} disabled={pending} />
                        </div>
                    </div>

                    <div className={`${selectedLang === 'pt-BR' ? 'block' : 'hidden'}`}>
                         <div className="space-y-2">
                            <Label htmlFor="name_pt">{t('adminDashboard.settingsGroups.catalogs.languages.table.name')}</Label>
                            <Input ref={namePtRef} id="name_pt" name="name_pt" defaultValue={item?.name_translations?.['pt-BR']} disabled={pending} />
                        </div>
                    </div>

                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>{t('common.cancel')}</Button>
                    <Button type="submit" disabled={pending}>{t('common.save')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

export default function LanguageManager() {
    const { t, locale } = useLocale();
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Language | null>(null);
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();

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
    
    const onFormSuccess = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        fetchData();
    }

    const handleDelete = (item: Language) => {
        startDeleteTransition(async () => {
            const result = await deleteLanguage(item.id);
            if(result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                fetchData();
            } else {
                 toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    const getTranslatedValue = (translations: TranslationObject | null) => {
        if (!translations) return '—';
        return translations[locale as 'es' | 'pt-BR'] || translations['pt-BR'] || translations.es || Object.values(translations)[0];
    }
    
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
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{t('adminDashboard.settingsGroups.catalogs.languages.title')}</CardTitle>
                        <CardDescription>{t('adminDashboard.settingsGroups.catalogs.languages.description')}</CardDescription>
                    </div>
                     <Button size="sm" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('common.create')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%] truncate">{t('adminDashboard.settingsGroups.catalogs.languages.table.key')}</TableHead>
                                    <TableHead className="w-[50%] truncate">{t('adminDashboard.settingsGroups.catalogs.languages.table.name')}</TableHead>
                                    <TableHead className="w-auto text-right">{t('adminDashboard.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {languages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            {t('adminDashboard.settingsGroups.catalogs.languages.noLanguages')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    languages.map((lang) => (
                                        <TableRow key={lang.id}>
                                            <TableCell className="font-medium truncate">{lang.id}</TableCell>
                                            <TableCell className="truncate">{getTranslatedValue(lang.name_translations)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingItem(lang); setIsFormOpen(true); }} disabled={lang.id === 'es' || lang.id === 'pt-BR'}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isDeleting || lang.id === 'es' || lang.id === 'pt-BR'}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                            {t('adminDashboard.settingsGroups.catalogs.languages.deleteConfirmation', {name: getTranslatedValue(lang.name_translations) || lang.id})}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(lang)}>{t('common.delete')}</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                 </ScrollArea>
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <LanguageForm 
                        item={editingItem}
                        onSuccess={onFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </Dialog>
            </CardContent>
        </Card>
    );
}
