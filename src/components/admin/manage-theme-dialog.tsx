
"use client";

import React from 'react';
import { useLocale } from '@/lib/i18n';
import { useAdminDashboard } from '../admin-dashboard-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun } from 'lucide-react';

export function ManageThemeDialog() {
    const { t } = useLocale();
    const { theme, handleSetTheme } = useAdminDashboard();
    
    return (
        <Card className="mt-4 border-none shadow-none">
            <CardHeader className="p-1">
                <CardTitle className="text-base">{t('dashboard.theme.title')}</CardTitle>
                <CardDescription>
                    Elige entre un tema claro u oscuro para el panel.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-1 pt-4">
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        variant={theme === 'light' ? 'default' : 'outline'}
                        onClick={() => handleSetTheme('light')}
                    >
                        <Sun className="mr-2 h-4 w-4" />
                        {t('dashboard.theme.light')}
                    </Button>
                    <Button 
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        onClick={() => handleSetTheme('dark')}
                    >
                        <Moon className="mr-2 h-4 w-4" />
                        {t('dashboard.theme.dark')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
