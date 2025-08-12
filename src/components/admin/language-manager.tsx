"use client";
    
import React, { useMemo, useState } from 'react';
import { useActionState, useFormStatus, useTransition } from 'react-dom';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import type { Language } from '@/actions/catalogs';
import { createLanguage, updateLanguage, deleteLanguage } from '@/actions/catalogs';
import { Edit, Loader, PlusCircle, Trash2 } from 'lucide-react';
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

export function LanguageManager({
    languages,
    onRefresh,
    onEdit,
    onCreate,
    isFormOpen,
    setIsFormOpen,
    editingItem,
}: {
    languages: Language[];
    onRefresh: () => void;
    onEdit: (lang: Language) => void;
    onCreate: () => void;
    isFormOpen: boolean;
    setIsFormOpen: (isOpen: boolean) => void;
    editingItem: Language | null;
}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();

    const columns = useMemo(() => [
        { key: 'id', header: t('adminDashboard.settingsGroups.languages.table.key') },
        { key: 'name_es', header: t('adminDashboard.settingsGroups.languages.table.name_es') },
        { key: 'name_pt', header: t('adminDashboard.settingsGroups.languages.table.name_pt') },
        { key: 'actions', header: t('adminDashboard.table.actions') }
    ], [t]);

    const handleDelete = (id: string) => {
        startDeleteTransition(async () => {
            const result = await deleteLanguage(id);
             if (result?.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                onRefresh();
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    }

    const onFormSuccess = () => {
        setIsFormOpen(false);
        onRefresh();
    }
    
    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('adminDashboard.settingsGroups.languages.title')}</CardTitle>
                        <CardDescription>{t('adminDashboard.settingsGroups.languages.description')}</CardDescription>
                    </div>
                     <Button size="sm" onClick={onCreate}>
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
                                                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
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

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                 <LanguageForm 
                    item={editingItem}
                    onSuccess={onFormSuccess}
                    onCancel={() => setIsFormOpen(false)}
                 />
            </Dialog>
        </>
    )
}
