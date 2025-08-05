
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Globe, KeyRound, Smartphone, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAppSetting, updateAppSetting } from '@/actions/settings';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

function MapSettingsTab() {
    const { t } = useLocale();
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateAppSetting('google_maps_api_key', apiKey);
        if (result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        setIsLoading(false);
    }
    
    React.useEffect(() => {
        const fetchKey = async () => {
            setIsLoading(true);
            const key = await getAppSetting('google_maps_api_key');
            setApiKey(key || '');
            setIsLoading(false);
        }
        fetchKey();
    }, []);

    return (
        <Card className="mt-4 border-none shadow-none">
            <CardHeader className="p-1">
                <CardTitle className="text-base">{t('adminDashboard.settingsGroups.catalogs.maps.title')}</CardTitle>
                <CardDescription>
                    {t('adminDashboard.settingsGroups.catalogs.maps.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-1 pt-4 space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="api-key">{t('adminDashboard.settingsGroups.catalogs.maps.apiKeyLabel')}</Label>
                    <Input 
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        disabled={isLoading}
                    />
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                    {t('common.save')}
                </Button>
            </CardContent>
        </Card>
    )
}

function PlaceholderTab({ title }: { title: string }) {
    const { t } = useLocale();
    return (
        <Card className="mt-4 border-dashed">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{t('adminDashboard.settingsGroups.catalogs.wipDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-48 w-full rounded-md border-dashed flex items-center justify-center bg-muted/30">
                    <span className="text-muted-foreground text-sm">{t('adminDashboard.settingsGroups.manageThemes.editorPlaceholder')}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function ManageCatalogsDialog() {
    const { t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Book className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.settingsGroups.catalogs')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.settingsGroups.catalogs')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.settingsGroups.catalogsDescription')}</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="maps" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="maps"><Globe className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.maps.tab')}</TabsTrigger>
                        <TabsTrigger value="devices"><Smartphone className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.deviceTypes.tab')}</TabsTrigger>
                        <TabsTrigger value="protocols"><Wifi className="mr-2 h-4 w-4" />{t('adminDashboard.settingsGroups.catalogs.protocols.tab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="maps">
                       <MapSettingsTab />
                    </TabsContent>
                    <TabsContent value="devices">
                        <PlaceholderTab title={t('adminDashboard.settingsGroups.catalogs.deviceTypes.title')} />
                    </TabsContent>
                     <TabsContent value="protocols">
                        <PlaceholderTab title={t('adminDashboard.settingsGroups.catalogs.protocols.title')} />
                    </TabsContent>
                </Tabs>
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="mt-4 w-full">
                        {t('common.close')}
                    </Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    )
}
