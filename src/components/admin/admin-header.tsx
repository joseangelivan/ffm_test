

"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useLocale } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  LogOut,
  Settings,
  Loader,
  KeyRound,
  Mailbox,
  Globe,
  Book,
  MessageSquareQuote,
  Building,
  Server,
  User,
  MapPin,
  Map as MapIcon,
  Home,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SessionPayload } from '@/lib/session';
import { handleLogoutAction, getSession } from '@/lib/session';
import { ManageAdminsDialog } from './manage-admins-dialog';
import { SmtpConfigDialog } from './smtp-config-dialog';
import { ManageAccountDialog } from './manage-account-dialog';
import { ManageDomainDialog } from './manage-domain-dialog';
import { ManageInterfaceDialog } from './manage-interface-dialog';
import { ManageCatalogsDialog } from './manage-catalogs-dialog';
import { ManageTranslatorDialog } from './manage-translator-dialog';
import { ManageGeocodingDialog } from './manage-geocoding-dialog';
import { ManageMapsDialog } from './manage-maps-dialog';
import { ManageAddressDialog } from './manage-address-dialog';
import { useDashboard } from '@/hooks/use-dashboard';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';


export function LoadingOverlay({ text }: { text: string }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{text}</span>
            </div>
        </div>
    );
}

function LogoutDialogForm({ onLogout }: { onLogout: () => Promise<void> }) {
    const { t } = useLocale();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    const handleConfirmLogout = async () => {
        setIsLoggingOut(true);
        await onLogout();
        router.push('/admin/login');
    };

    return (
        <>
            {isLoggingOut && <LoadingOverlay text={t('login.loggingOut')} />}
            <AlertDialogHeader>
                <AlertDialogTitle>{t('dashboard.logoutConfirmation.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('dashboard.logoutConfirmation.description')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center pt-4">
                <AlertDialogCancel disabled={isLoggingOut}>{t('dashboard.logoutConfirmation.cancel')}</AlertDialogCancel>
                <Button onClick={handleConfirmLogout} disabled={isLoggingOut} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90">
                    {t('dashboard.logoutConfirmation.confirm')}
                </Button>
            </AlertDialogFooter>
        </>
    );
}


interface AdminHeaderProps {
    session: SessionPayload | null;
    condoName?: string;
}

export function AdminHeader({ session: initialSession, condoName }: AdminHeaderProps) {
    const [session, setSession] = useState(initialSession);
    const [isLoading, setIsLoading] = useState(!initialSession);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const { t } = useLocale();
    const { onAccountUpdateSuccess } = useDashboard();
    const isCondoView = !!condoName;

    useEffect(() => {
        const checkSession = async () => {
            if (!initialSession) {
                const currentSession = await getSession();
                setSession(currentSession);
            }
            setIsLoading(false);
        };
        checkSession();
    }, [initialSession]);

    if (isLoading) {
       return (
         <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-40">
            <div className="flex items-center gap-2">
                 <Skeleton className="h-6 w-6 rounded-full" />
                 <Skeleton className="h-6 w-48" />
            </div>
            <div className="ml-auto">
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
        </header>
       )
    }

    if (!session) {
       return (
        <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-40">
            <div className="flex-1">
                 <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Sessão Expirada</AlertTitle>
                  <AlertDescription>
                    Sua sessão expirou. Por favor, faça login novamente.
                  </AlertDescription>
                </Alert>
            </div>
        </header>
       )
    }

    return (
        <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-40">
            <div className="flex items-center gap-2">
                 {isCondoView ? <Building className="h-6 w-6 text-primary"/> : <Shield className="h-6 w-6 text-primary"/>}
                <h1 className="text-lg font-semibold md:text-2xl font-headline">
                    {isCondoView ? condoName : t('adminDashboard.title')}
                </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://placehold.co/100x100.png?text=${session.name.charAt(0)}`} alt={session.name} data-ai-hint="avatar" />
                        <AvatarFallback>{session.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{session.email}</p>
                    </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     
                    <DropdownMenuItem onSelect={() => setIsAccountDialogOpen(true)}>
                        <User className="mr-2 h-4 w-4" />
                        <span>{t('adminDashboard.account.myAccount')}</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>{t('dashboard.settings')}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                             <DropdownMenuSubContent>
                                <ManageInterfaceDialog />
                                <ManageCatalogsDialog />
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Server className="mr-2 h-4 w-4" />
                                        <span>{t('adminDashboard.settingsGroups.systemConfiguration')}</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <SmtpConfigDialog />
                                            <ManageDomainDialog />
                                            <ManageTranslatorDialog />
                                            <ManageGeocodingDialog />
                                            <ManageMapsDialog />
                                            <ManageAddressDialog />
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator/>
                                {session.canCreateAdmins && <ManageAdminsDialog session={session}/>}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t('dashboard.logout')}</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <LogoutDialogForm onLogout={handleLogoutAction} />
                    </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
                </DropdownMenu>

                <ManageAccountDialog
                    isOpen={isAccountDialogOpen}
                    onOpenChange={setIsAccountDialogOpen}
                    session={session}
                />
            </div>
        </header>
    );
}
