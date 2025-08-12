"use client";

import React, { useState, useMemo, useCallback, useEffect, useActionState, useTransition } from 'react';
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
import { Edit, Trash2, PlusCircle } from 'lucide-react';
import { getLanguages, createLanguage, updateLanguage, deleteLanguage, type Language } from '@/actions/catalogs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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

function LanguageForm({ item, onSuccess, onCancel, t }: { item: Language | null, onSuccess: () => void, onCancel: () => void, t: (key: string) => string }) {
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
    };
    
    const [state, dispatch] = useActionState(handleAction, undefined);

    return (
        <DialogContent>
            <form action={dispatch}>
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? t('adminDashboard.settingsGroups.languages.editTitle') : t('adminDashboard.settingsGroups.languages.createTitle')}
                    </DialogTitle>
                </DialogHeader>
                 <input type="hidden" name="id" value={item?.id || ''} />
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">{t('adminDashboard.settingsGroups.languages.table.key')}</Label>
                        <Input id="id" name="id" defaultValue={item?.id} required disabled={isEditMode}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_es">{t('adminDashboard.settingsGroups.languages.table.name_es')}</Label>
                        <Input id="name_es" name="name_es" defaultValue={item?.name_translations.es} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="name_pt">{t('adminDashboard.settingsGroups.languages.table.name_pt')}</Label>
                        <Input id="name_pt" name="name_pt" defaultValue={item?.name_translations['pt-BR']} required />
                    </div>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button type="submit">{t('common.save')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

export function LanguageManager() {
    const { t } = useLocale();
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

    const columns = useMemo(() => [
        { key: 'id', header: t('adminDashboard.settingsGroups.languages.table.key') },
        { key: 'name_es', header: t('adminDashboard.settingsGroups.languages.table.name_es') },
        { key: 'name_pt', header: t('adminDashboard.settingsGroups.languages.table.name_pt') },
        { key: 'actions', header: t('adminDashboard.table.actions') },
    ], [t]);
    
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
                        <CardTitle>{t('adminDashboard.settingsGroups.languages.title')}</CardTitle>
                        <CardDescription>{t('adminDashboard.settingsGroups.languages.description')}</CardDescription>
                    </div>
                     <Button size="sm" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('common.create')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-hidden">
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/4 truncate">{columns[0].header}</TableHead>
                                <TableHead className="w-1/4 truncate">{columns[1].header}</TableHead>
                                <TableHead className="w-1/4 truncate">{columns[2].header}</TableHead>
                                <TableHead className="w-auto min-w-[120px] text-right">{columns[3].header}</TableHead>
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
                                (languages || []).map((lang) => (
                                    <TableRow key={lang.id}>
                                        <TableCell className="font-medium truncate">{lang.id}</TableCell>
                                        <TableCell className="truncate">{lang.name_translations.es}</TableCell>
                                        <TableCell className="truncate">{lang.name_translations['pt-BR']}</TableCell>
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
                                                        {t('adminDashboard.settingsGroups.languages.deleteConfirmation', {name: lang.name_translations['pt-BR'] || lang.id})}
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
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <LanguageForm 
                        item={editingItem}
                        onSuccess={onFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                        t={t}
                    />
                </Dialog>
            </CardContent>
        </Card>
    );
}