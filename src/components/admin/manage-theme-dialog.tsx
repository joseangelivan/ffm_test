"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useLocale } from '@/lib/i18n';
import { useAdminDashboard } from '../admin-dashboard-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManageThemeListDialog } from './manage-theme-list-dialog';
import { getThemes, type Theme } from '@/actions/themes';


export function ManageThemeDialog() {
    const { t } = useLocale();
    const { theme, handleSetTheme } = useAdminDashboard();
    const [customThemes, setCustomThemes] = useState<Theme[]>([]);

    useEffect(() => {
        async function fetchThemes() {
            const themes = await getThemes();
            setCustomThemes(themes);
        }
        fetchThemes();
    }, []);
    
    return (
        <Card className="mt-4 border-none shadow-none">
            <CardHeader className="p-1">
                <CardTitle className="text-base">{t('dashboard.theme.title')}</CardTitle>
                <CardDescription>
                    {t('adminDashboard.settingsGroups.themeDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-1 pt-4">
                 <div className="flex items-center gap-2">
                    <Select value={theme} onValueChange={(value) => handleSetTheme(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tema" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">{t('dashboard.theme.light')}</SelectItem>
                            <SelectItem value="dark">{t('dashboard.theme.dark')}</SelectItem>
                            {customThemes.map(ct => (
                                <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4"/>
                            </Button>
                        </DialogTrigger>
                        <ManageThemeListDialog />
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
