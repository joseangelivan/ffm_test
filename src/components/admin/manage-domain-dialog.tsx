
"use client";

import React, { useState, useEffect, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Globe, Link as LinkIcon, Loader } from 'lucide-react';
import { getAppSetting, updateAppSetting } from '@/actions/settings';
import { LoadingOverlay } from './admin-header';

export function ManageDomainDialog() {
    const { t } = useLocale();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [domain, setDomain] = useState('');
    const [isLoading, startLoadingTransition] = useTransition();

    useEffect(() => {
        if (isOpen) {
            startLoadingTransition(async () => {
                const currentDomain = await getAppSetting('app_domain');
                setDomain(currentDomain || '');
            });
        }
    }, [isOpen]);

    const handleAction = async () => {
        startLoadingTransition(async () => {
            const result = await updateAppSetting('app_domain', domain);
            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                setIsOpen(false);
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };
    
    const handleExtractDomain = () => {
        if (typeof window !== 'undefined') {
            setDomain(window.location.origin);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Globe className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.settingsGroups.domainConfig')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <div className={cn("relative transition-opacity", isLoading && "opacity-50")}>
                    {isLoading && <LoadingOverlay text={t('adminDashboard.loadingOverlay.loading')} />}
                    <DialogHeader>
                        <DialogTitle>{t('adminDashboard.settingsGroups.domainConfigTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('adminDashboard.settingsGroups.domainConfigDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="domain">{t('adminDashboard.settingsGroups.domainConfigLabel')}</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    id="domain" 
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="https://su-dominio.com"
                                    disabled={isLoading}
                                />
                                <Button type="button" variant="outline" onClick={handleExtractDomain} disabled={isLoading}>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    {t('adminDashboard.settingsGroups.extractButton')}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>{t('common.cancel')}</Button>
                        <Button type="button" onClick={handleAction} disabled={isLoading}>{t('common.save')}</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
