
"use client";

import React from 'react';
import { useLocale } from '@/lib/i18n';
import { useAdminDashboard } from '../admin-dashboard-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ManageLanguageDialog() {
    const { t, locale } = useLocale();
    const { handleSetLocale } = useAdminDashboard();
    
    return (
        <Card className="mt-4 border-none shadow-none">
            <CardHeader className="p-1">
                <CardTitle className="text-base">{t('dashboard.language')}</CardTitle>
                <CardDescription>
                    Selecciona el idioma para la interfaz de administración.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-1 pt-4">
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        variant={locale === 'es' ? 'default' : 'outline'}
                        onClick={() => handleSetLocale('es')}
                    >
                        Español
                    </Button>
                    <Button 
                        variant={locale === 'pt' ? 'default' : 'outline'}
                        onClick={() => handleSetLocale('pt')}
                    >
                        Português
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
