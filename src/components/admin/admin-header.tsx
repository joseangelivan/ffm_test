
"use client";

import React, { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useLocale } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  User,
  Languages,
  Moon,
  Sun,
  Loader,
  KeyRound,
  Mailbox,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAdminDashboard } from '../admin-dashboard-client';
import { handleLogoutAction } from '@/lib/session';
import { ManageAdminsDialog } from './manage-admins-dialog';
import { SmtpConfigDialog } from './smtp-config-dialog';
import { ManageAccountDialog } from './manage-account-dialog';
import { ManageDomainDialog } from './manage-domain-dialog';


export function LoadingOverlay({ text }: { text: string }) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{text}</span>
            </div>
        </div>
    );
}

function LogoutDialogContent() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
         <div className={cn("relative", pending && "opacity-50")}>
            {pending && (
                 <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                        <Loader className="h-12 w-12 animate-spin" />
                        <span>{t('login.loggingOut')}</span>
                    </div>
                </div>
            )}
            <AlertDialogHeader>
                <AlertDialogTitle>{t('dashboard.logoutConfirmation.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('dashboard.logoutConfirmation.description')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center pt-4">
                <AlertDialogCancel disabled={pending}>{t('dashboard.logoutConfirmation.cancel')}</AlertDialogCancel>
                <Button type="submit" disabled={pending} className="w-40 bg-destructive hover:bg-destructive/90">
                    {t('dashboard.logoutConfirmation.confirm')}
                </Button>
            </AlertDialogFooter>
        </div>
    )
}

export function AdminHeader({ onAccountUpdateSuccess }: { onAccountUpdateSuccess: (data: any) => void }) {
    const { session, theme, handleSetTheme, handleSetLocale } = useAdminDashboard();
    const { t, locale } = useLocale();
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

    return (
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-40">
            <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary"/>
                <h1 className="text-lg font-semibold md:text-2xl font-headline">{t('adminDashboard.title')}</h1>
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
                    <ManageAccountDialog
                        isOpen={isAccountDialogOpen}
                        onOpenChange={setIsAccountDialogOpen}
                        onSuccess={onAccountUpdateSuccess}
                    />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        setIsAccountDialogOpen(true);
                      }}
                    >
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
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Languages className="mr-2 h-4 w-4" />
                                    <span>{t('dashboard.language')}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleSetLocale('es')}>
                                        Español {locale === 'es' && <span className="ml-auto">✓</span>}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSetLocale('pt')}>
                                        Português {locale === 'pt' && <span className="ml-auto">✓</span>}
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                    <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                    <span>{t('dashboard.theme.title')}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleSetTheme('light')}>
                                        {t('dashboard.theme.light')} {theme === 'light' && <span className="ml-auto">✓</span>}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSetTheme('dark')}>
                                        {t('dashboard.theme.dark')} {theme === 'dark' && <span className="ml-auto">✓</span>}
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                                <DropdownMenuSeparator/>
                                {session.canCreateAdmins && <ManageAdminsDialog currentAdminId={session.id}/>}
                                <SmtpConfigDialog />
                                <ManageDomainDialog />
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
                        <form action={handleLogoutAction}>
                        <LogoutDialogContent />
                        </form>
                    </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
