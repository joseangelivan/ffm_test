"use client";

import React, { useTransition, useMemo } from 'react';
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
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteLanguage, type Language } from '@/actions/catalogs';
import { useLocale } from '@/lib/i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';

type LanguageManagerProps = {
    languages: Language[];
    onRefresh: () => void;
    onEdit: (language: Language) => void;
};

export function LanguageManager({ 
    languages,
    onRefresh,
    onEdit,
}: LanguageManagerProps) {
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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('adminDashboard.settingsGroups.languages.title')}</CardTitle>
                    <CardDescription>{t('adminDashboard.settingsGroups.languages.description')}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                            <TableRow>
                                <TableHead className="w-1/4">{columns[0].header}</TableHead>
                                <TableHead>{columns[1].header}</TableHead>
                                <TableHead>{columns[2].header}</TableHead>
                                <TableHead className="w-auto text-right whitespace-nowrap">{columns[3].header}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {languages.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No languages found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                languages.map(item => {
                                    const isDefault = item.id === 'es' || item.id === 'pt-BR';
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-xs truncate">{item.id}</TableCell>
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
    );
}