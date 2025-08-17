
"use client";

import React, { useState } from 'react';
import {
  PlusCircle,
  Edit,
  Trash2,
  Video,
  Building2,
  Home,
  Square,
  Layers,
  Sparkles,
  Search,
  Upload,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/i18n';

const AddElementTypeDialog = ({
    isOpen,
    onOpenChange,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
     const { t } = useLocale();
     return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                        <DialogTitle>{t('condoDashboard.map.elements.addTypeDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('condoDashboard.map.elements.addTypeDialog.description')}
                        </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div>
                        <Label htmlFor="element-name">{t('condoDashboard.map.elements.addTypeDialog.typeNameLabel')}</Label>
                        <Input id="element-name" placeholder={t('condoDashboard.map.elements.addTypeDialog.typeNamePlaceholder')} />
                    </div>
                    <div>
                        <Label>{t('condoDashboard.map.elements.addTypeDialog.iconLabel')}</Label>
                        <Tabs defaultValue="collection">
                            <TabsList className="grid w-full grid-cols-5 h-auto">
                                <TabsTrigger value="collection" className="flex-col gap-1 h-14"><Layers className="h-4 w-4"/>{t('condoDashboard.map.elements.addTypeDialog.tabs.collection')}</TabsTrigger>
                                <TabsTrigger value="ai" className="flex-col gap-1 h-14"><Sparkles className="h-4 w-4"/>{t('condoDashboard.map.elements.addTypeDialog.tabs.ai')}</TabsTrigger>
                                <TabsTrigger value="search" className="flex-col gap-1 h-14"><Search className="h-4 w-4"/>{t('condoDashboard.map.elements.addTypeDialog.tabs.search')}</TabsTrigger>
                                <TabsTrigger value="pc" className="flex-col gap-1 h-14"><Upload className="h-4 w-4"/>{t('condoDashboard.map.elements.addTypeDialog.tabs.pc')}</TabsTrigger>
                                <TabsTrigger value="link" className="flex-col gap-1 h-14"><Link2 className="h-4 w-4"/>{t('condoDashboard.map.elements.addTypeDialog.tabs.link')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="collection" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>{t('condoDashboard.map.elements.addTypeDialog.collection.title')}</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{t('condoDashboard.map.elements.addTypeDialog.collection.description')}</p>
                                    </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="ai" className="mt-4">
                                <Card>
                                    <CardHeader><CardTitle>{t('condoDashboard.map.elements.addTypeDialog.ai.title')}</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">{t('condoDashboard.map.elements.addTypeDialog.ai.description')}</p>
                                        <Textarea placeholder={t('condoDashboard.map.elements.addTypeDialog.ai.placeholder')}/>
                                        <div className="flex justify-center items-center h-24 bg-muted rounded-md">
                                            <span className="text-muted-foreground">{t('condoDashboard.map.elements.addTypeDialog.ai.preview')}</span>
                                        </div>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="search" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>{t('condoDashboard.map.elements.addTypeDialog.search.title')}</CardTitle></CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">{t('condoDashboard.map.elements.addTypeDialog.search.description')}</p>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="pc" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>{t('condoDashboard.map.elements.addTypeDialog.pc.title')}</CardTitle></CardHeader>
                                        <CardContent>
                                        <p className="text-sm text-muted-foreground">{t('condoDashboard.map.elements.addTypeDialog.pc.description')}</p>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="link" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>{t('condoDashboard.map.elements.addTypeDialog.link.title')}</CardTitle></CardHeader>
                                        <CardContent>
                                        <p className="text-sm text-muted-foreground">{t('condoDashboard.map.elements.addTypeDialog.link.description')}</p>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
                    <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
                    <Button>{t('common.save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
     )
}

export function ManageElementTypeDialog() {
    const { t } = useLocale();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    
    const mockElementTypes = [
        {id: 'cam', name: t('condoDashboard.map.elementTypes.camera'), icon: <Video className="h-4 w-4" />},
        {id: 'gate', name: t('condoDashboard.map.elementTypes.gatehouse'), icon: <Building2 className="h-4 w-4" />},
        {id: 'house', name: t('condoDashboard.map.elementTypes.housing_area'), icon: <Home className="h-4 w-4" />},
        {id: 'other', name: t('condoDashboard.map.elementTypes.other'), icon: <Square className="h-4 w-4" />}
    ]

    return (
        <>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('condoDashboard.map.elements.manageTypesDialog.title')}</DialogTitle>
                    <DialogDescription>
                       {t('condoDashboard.map.elements.manageTypesDialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                         {mockElementTypes.map(type => (
                            <div key={type.id} className="flex items-center justify-between p-2 border rounded-md">
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">{type.icon}</span>
                                    <span>{type.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                     <DialogClose asChild>
                        <Button variant="outline">{t('common.close')}</Button>
                    </DialogClose>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('condoDashboard.map.elements.manageTypesDialog.addButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <AddElementTypeDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
        </>
    );
};
