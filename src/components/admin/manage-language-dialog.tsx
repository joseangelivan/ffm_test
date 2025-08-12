
"use client";

import React from 'react';
import {
    Dialog,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useLocale } from '@/lib/i18n';
import { useAdminDashboard } from '../admin-dashboard-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { ManageLanguageListDialog } from './manage-language-list-dialog';

export function ManageLanguageDialog() {
    const { t, locale } = useLocale();
    const { handleSetLocale } = useAdminDashboard();
    
    return (
        <Card className="mt-4 border-none shadow-none">
            <CardHeader className="p-1">
                <CardTitle className="text-base">{t('dashboard.language')}</CardTitle>
                <CardDescription>
                    {t('adminDashboard.settingsGroups.languageDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-1 pt-4">
                <div className="flex items-center gap-2">
                    <Select value={locale} onValueChange={(value) => handleSetLocale(value as 'es' | 'pt-BR')}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar idioma" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        </SelectContent>
                    </Select>
                     <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4"/>
                            </Button>
                        </DialogTrigger>
                        <ManageLanguageListDialog />
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
