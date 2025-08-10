
"use client";

import React, { useState, useTransition, useActionState } from 'react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { MoreVertical, Edit, Trash2, PlusCircle, Loader } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createDeviceType, updateDeviceType, deleteDeviceType } from '@/actions/catalogs';
import type { TranslationObject } from '@/actions/catalogs';

type DataItem = {
    id: string;
    [key: string]: any;
};

type CatalogManagerProps = {
    title: string;
    data: DataItem[];
    columns: Record<string, string>;
    onRefresh: () => void;
};

function CatalogForm({
    item,
    onSuccess,
    onCancel,
}: {
    item: DataItem | null;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!item;
    const formAction = isEditMode ? updateDeviceType : createDeviceType;
    const [selectedLang, setSelectedLang] = useState<'es' | 'pt'>('es');
    
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
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? t('adminDashboard.settingsGroups.catalogs.form.editTitle') : t('adminDashboard.settingsGroups.catalogs.form.createTitle')}
                    </DialogTitle>
                </DialogHeader>
                <input type="hidden" name="id" value={item?.id || ''} />
                
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>{t('dashboard.language')}</Label>
                        <Select value={selectedLang} onValueChange={(value) => setSelectedLang(value as 'es' | 'pt')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar idioma"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="es">{t('adminDashboard.settingsGroups.catalogs.form.tab_es')}</SelectItem>
                                <SelectItem value="pt">{t('adminDashboard.settingsGroups.catalogs.form.tab_pt')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Spanish Fields - Always in DOM for form submission */}
                    <div className={`${selectedLang === 'es' ? 'block' : 'hidden'}`}>
                         <div className="space-y-2">
                            <Label htmlFor="name_es">{t('adminDashboard.settingsGroups.catalogs.form.nameLabel')}</Label>
                            <Input id="name_es" name="name_es" defaultValue={item?.name_translations?.es} required />
                        </div>
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="features_es">{t('adminDashboard.settingsGroups.catalogs.form.featuresLabel')}</Label>
                            <Textarea id="features_es" name="features_es" defaultValue={item?.features_translations?.es} />
                        </div>
                    </div>

                    {/* Portuguese Fields - Always in DOM for form submission */}
                    <div className={`${selectedLang === 'pt' ? 'block' : 'hidden'}`}>
                         <div className="space-y-2">
                            <Label htmlFor="name_pt">{t('adminDashboard.settingsGroups.catalogs.form.nameLabel')}</Label>
                            <Input id="name_pt" name="name_pt" defaultValue={item?.name_translations?.pt} required />
                        </div>
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="features_pt">{t('adminDashboard.settingsGroups.catalogs.form.featuresLabel')}</Label>
                            <Textarea id="features_pt" name="features_pt" defaultValue={item?.features_translations?.pt} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button type="submit">{t('common.save')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    )
}


export function CatalogManager({ title, data, columns, onRefresh }: CatalogManagerProps) {
    const { t, locale } = useLocale();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DataItem | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const handleEdit = (item: DataItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        startDeleteTransition(async () => {
            const result = await deleteDeviceType(id);
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

    const getTranslatedValue = (translations: TranslationObject) => {
        return translations?.[locale] || translations?.pt || Object.values(translations)[0];
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{title}</h3>
                <Button size="sm" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('common.create')}
                </Button>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Object.values(columns).map(header => <TableHead key={header}>{header}</TableHead>)}
                            <TableHead className="text-right">{t('adminDashboard.settingsGroups.catalogs.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map(item => (
                            <TableRow key={item.id}>
                                {Object.keys(columns).map(colKey => (
                                    <TableCell key={colKey}>
                                        {item[colKey] ? getTranslatedValue(item[colKey]) : '—'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <Dialog>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                        </Dialog>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                   {t('adminDashboard.deleteCondoDialog.description', {name: getTranslatedValue(item.name_translations)})}
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <CatalogForm 
                    item={editingItem} 
                    onSuccess={onFormSuccess}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Dialog>
        </div>
    );
}
