
"use client";

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Language } from '@/actions/catalogs';

interface LanguageManagerProps {
    languages: Language[];
    onRefresh: () => void;
    t: (key: string) => string;
}

export function LanguageManager({ languages, onRefresh, t }: LanguageManagerProps) {
    const columns = useMemo(() => [
        { key: 'id', header: t('adminDashboard.settingsGroups.languages.table.key') },
        { key: 'name_es', header: t('adminDashboard.settingsGroups.languages.table.name_es') },
        { key: 'name_pt', header: t('adminDashboard.settingsGroups.languages.table.name_pt') },
        { key: 'actions', header: t('adminDashboard.table.actions') },
    ], [t]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('adminDashboard.settingsGroups.languages.title')}</CardTitle>
                <CardDescription>{t('adminDashboard.settingsGroups.languages.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-hidden">
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/4 truncate">{columns[0].header}</TableHead>
                                <TableHead className="w-1/4 truncate">{columns[1].header}</TableHead>
                                <TableHead className="w-1/4 truncate">{columns[2].header}</TableHead>
                                <TableHead className="w-auto min-w-[120px] text-right">{columns[3].header}</TableHead>
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
                                (languages || []).map((lang) => (
                                    <TableRow key={lang.id}>
                                        <TableCell className="font-medium truncate">{lang.id}</TableCell>
                                        <TableCell className="truncate">{lang.name_translations.es}</TableCell>
                                        <TableCell className="truncate">{lang.name_translations['pt-BR']}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" disabled>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
