
"use client";

import React, { useState } from 'react';
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


export function ManageThemeDialog() {
    const { t } = useLocale();
    const { theme, handleSetTheme } = useAdminDashboard();
    
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
                    <Select value={theme} onValueChange={(value) => handleSetTheme(value as 'light' | 'dark')}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tema" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">{t('dashboard.theme.light')}</SelectItem>
                            <SelectItem value="dark">{t('dashboard.theme.dark')}</SelectItem>
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
