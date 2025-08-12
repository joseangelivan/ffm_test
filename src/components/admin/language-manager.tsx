
"use client";

import React, { useTransition, useActionState, useMemo, useState } from 'react';
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
import { Edit, Trash2, Loader, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { createLanguage, updateLanguage, deleteLanguage, type Language } from '@/actions/catalogs';
import { useLocale } from '@/lib/i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

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
                        <Label htmlFor="id">{t('adminDashboard.settingsGroups.languages.table.key')}</Label>
                        <Input id="id" name="id" defaultValue={item?.id} required disabled={isEditMode} placeholder="ej. en-US" />
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

type LanguageManagerProps = {
    initialLanguages: Language[];
    onRefresh: () => void;
};

export function LanguageManager({ 
    initialLanguages, 
    onRefresh,
}: LanguageManagerProps) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Language | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const columns = [
        { key: 'id', header: t('adminDashboard.settingsGroups.languages.table.key') },
        { key: 'name_es', header: t('adminDashboard.settingsGroups.languages.table.name_es') },
        { key: 'name_pt', header: t('adminDashboard.settingsGroups.languages.table.name_pt') },
    ];

    const handleEdit = (item: Language) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

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
        setEditingItem(null);
        onRefresh();
    };

    return (
        <div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('adminDashboard.settingsGroups.languages.title')}</CardTitle>
                        <CardDescription>{t('adminDashboard.settingsGroups.languages.description')}</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('common.create')}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                                <TableRow>
                                    {columns.map(col => <TableHead key={col.key}>{col.header}</TableHead>)}
                                    <TableHead className="text-right">{t('adminDashboard.settingsGroups.catalogs.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialLanguages.map(item => {
                                    const isDefault = item.id === 'es' || item.id === 'pt-BR';
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                            <TableCell>{item.name_translations.es}</TableCell>
                                            <TableCell>{item.name_translations['pt-BR']}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
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
                                })}
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
        </div>
    );
}
