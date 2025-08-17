
"use client";

import React, { useState, useTransition, useActionState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Edit, Trash2, PlusCircle, Loader, Languages } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProtocols, createProtocol, updateProtocol, deleteProtocol, type Protocol } from '@/actions/catalogs';
import type { TranslationObject } from '@/actions/catalogs';
import { translateTextAction } from '@/actions/translation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';

function ProtocolForm({
    item,
    onSuccess,
    onCancel,
}: {
    item: Protocol | null;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const { toast } = useToast();
    const { t } = useLocale();
    const isEditMode = !!item;
    const formAction = isEditMode ? updateProtocol : createProtocol;
    const [selectedLang, setSelectedLang] = useState<'es' | 'pt-BR'>('pt-BR');
    
    const featuresEsRef = useRef<HTMLTextAreaElement>(null);
    const featuresPtRef = useRef<HTMLTextAreaElement>(null);

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
    }
    
    const [state, dispatch] = useActionState(handleAction, undefined);
    const { pending } = useFormStatus();

    const handleTranslate = () => {
        startTranslateTransition(async () => {
            const sourceLang = selectedLang === 'pt-BR' ? 'pt' : 'es';
            const targetLang = selectedLang === 'pt-BR' ? 'es' : 'pt';

            const featuresRef = sourceLang === 'es' ? featuresEsRef : featuresPtRef;
            const targetFeaturesRef = targetLang === 'es' ? featuresEsRef : featuresPtRef;

            const featuresToTranslate = featuresRef.current?.value || '';

            try {
                const featuresResult = await translateTextAction({ text: featuresToTranslate, sourceLang, targetLang });

                if (featuresResult.success && featuresResult.data && targetFeaturesRef.current) {
                    targetFeaturesRef.current.value = featuresResult.data;
                } else if (!featuresResult.success) {
                     toast({ title: t('toast.errorTitle'), description: featuresResult.message, variant: 'destructive' });
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
                        {isEditMode ? t('adminDashboard.settingsGroups.catalogs.protocols.editTitle') : t('adminDashboard.settingsGroups.catalogs.protocols.createTitle')}
                    </DialogTitle>
                </DialogHeader>
                <input type="hidden" name="id" value={item?.id || ''} />
                
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">{t('adminDashboard.settingsGroups.catalogs.table.name')}</Label>
                        <Input id="name" name="name" defaultValue={item?.name} />
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
                                        <Button type="button" variant="outline" size="icon" onClick={handleTranslate}>
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
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="features_es">{t('adminDashboard.settingsGroups.catalogs.form.featuresLabel')}</Label>
                            <Textarea ref={featuresEsRef} id="features_es" name="features_es" defaultValue={item?.features_translations?.es || ''} />
                        </div>
                    </div>

                    <div className={`${selectedLang === 'pt-BR' ? 'block' : 'hidden'}`}>
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="features_pt">{t('adminDashboard.settingsGroups.catalogs.form.featuresLabel')}</Label>
                            <Textarea ref={featuresPtRef} id="features_pt" name="features_pt" defaultValue={item?.features_translations?.['pt-BR'] || ''} />
                        </div>
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

export default function ProtocolManager() {
    const { toast } = useToast();
    const { t, locale } = useLocale();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Protocol | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getProtocols();
            setProtocols(data || []);
        } catch (error) {
            console.error("Failed to fetch protocols:", error);
            setProtocols([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const columns = useMemo(() => [
        { key: 'name', header: t('adminDashboard.settingsGroups.catalogs.table.name') },
        { key: 'features_translations', header: t('adminDashboard.settingsGroups.catalogs.table.features') }
    ], [t]);


    const handleEdit = (item: Protocol) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        startDeleteTransition(async () => {
            const result = await deleteProtocol(id);
             if (result?.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                fetchData();
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    const onFormSuccess = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        fetchData();
    };

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
                        <CardTitle>{t('adminDashboard.settingsGroups.catalogs.protocols.title')}</CardTitle>
                        <CardDescription>{t('adminDashboard.settingsGroups.catalogs.protocols.description')}</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('common.create')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map(col => <TableHead key={col.key}>{col.header}</TableHead>)}
                                    <TableHead className="text-right">{t('adminDashboard.settingsGroups.catalogs.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {protocols.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                                            {t('adminDashboard.settingsGroups.catalogs.protocols.noData')}
                                        </TableCell>
                                    </TableRow>
                                ) : protocols.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>
                                            {getTranslatedValue(item.features_translations)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                        {t('adminDashboard.settingsGroups.catalogs.protocols.deleteConfirmation', {name: item.name})}
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
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <ProtocolForm 
                        item={editingItem} 
                        onSuccess={onFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </Dialog>
            </CardContent>
        </Card>
    );
}
