
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { getLanguages, type Language } from '@/actions/catalogs';
import { LanguageManager } from './language-manager';
import { Skeleton } from '../ui/skeleton';

export function ManageLanguageListDialog() {
    const { t } = useLocale();
    const [isLoading, setIsLoading] = useState(true);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Language | null>(null);

    const fetchLanguages = useCallback(async () => {
        setIsLoading(true);
        const data = await getLanguages();
        setLanguages(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchLanguages();
    }, [fetchLanguages]);

    const onFormSuccess = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        fetchLanguages();
    }
    
    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{t('adminDashboard.settingsGroups.manageLanguages.title')}</DialogTitle>
                <DialogDescription>
                    {t('adminDashboard.settingsGroups.manageLanguages.description')}
                </DialogDescription>
            </DialogHeader>

            <div className="py-4">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <LanguageManager 
                        initialLanguages={languages} 
                        onRefresh={fetchLanguages}
                        isFormOpen={isFormOpen}
                        setIsFormOpen={setIsFormOpen}
                        editingItem={editingItem}
                        setEditingItem={setEditingItem}
                    />
                )}
            </div>

            <DialogFooter className="sm:justify-between pt-4">
                 <DialogClose asChild>
                    <Button type="button" variant="outline">{t('common.close')}</Button>
                </DialogClose>
                <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('adminDashboard.settingsGroups.manageLanguages.addButton')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
