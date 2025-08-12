
"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    createAdmin, 
    getAdmins, 
    updateAdmin, 
    deleteAdmin, 
    type Admin 
} from '@/actions/admin';
import { sendAdminFirstLoginEmail } from '@/lib/mailer';
import { 
    KeyRound, 
    RefreshCw, 
    UserPlus, 
    MoreVertical, 
    Edit, 
    Mail, 
    Trash2 
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';


function AdminFormDialog({
    isOpen,
    onOpenChange,
    admin,
    onSuccess,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    admin?: Admin | null;
    onSuccess: () => void;
}) {
    const { t, locale } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!admin;
    const formAction = isEditMode ? updateAdmin : createAdmin;

    const [pin, setPin] = useState('');

    useEffect(() => {
        if (!isEditMode) {
            generatePin();
        }
    }, [isEditMode]);

    const generatePin = () => {
        const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
        setPin(randomPin);
    };

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result?.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            if (result.data?.emailFailed) {
                toast({ title: t('toast.errorTitle'), description: result.data.message, variant: 'destructive' });
            }
            onSuccess();
        } else if (result) {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    };

    const [state, dispatch, isPending] = useActionState(handleAction, undefined);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                 <form action={dispatch}>
                    <div className={cn("relative transition-opacity", isPending && "opacity-50")}>
                        {isPending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? t('adminDashboard.manageAdmins.editTitle') : t('adminDashboard.manageAdmins.createTitle')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.manageAdmins.formDescription')}</DialogDescription>
                        </DialogHeader>
                        <input type="hidden" name="id" value={admin?.id || ''} />
                        <input type="hidden" name="locale" value={locale} />
                         <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminDashboard.manageAdmins.nameLabel')}</Label>
                                <Input id="name" name="name" defaultValue={admin?.name} placeholder="John Doe" required disabled={isPending}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('adminDashboard.manageAdmins.emailLabel')}</Label>
                                <Input id="email" name="email" type="email" defaultValue={admin?.email} placeholder="admin@example.com" required autoComplete="email" disabled={isPending}/>
                            </div>
                            {!isEditMode && (
                                <div className="grid gap-2">
                                    <Label htmlFor="pin">{t('adminDashboard.manageAdmins.pinLabel')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="pin" name="pin" type="text" placeholder="123456" required maxLength={6} pattern="\d{6}" disabled={isPending} value={pin} readOnly/>
                                        <Button type="button" variant="outline" onClick={generatePin} disabled={isPending}>
                                            <RefreshCw className="mr-2 h-4 w-4"/>
                                            {t('adminDashboard.manageAdmins.generatePinButton')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                               <Checkbox id="can_create_admins" name="can_create_admins" defaultChecked={admin?.can_create_admins} disabled={isPending}/>
                               <Label htmlFor="can_create_admins" className="text-sm font-normal">
                                    {t('adminDashboard.manageAdmins.canCreateAdminsLabel')}
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{t('adminDashboard.newCondoDialog.cancel')}</Button>
                            <Button type="submit" disabled={isPending}>
                                {isEditMode ? t('adminDashboard.editCondoDialog.save') : t('adminDashboard.manageAdmins.createButton')}
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}


export function ManageAdminsDialog({ currentAdminId }: { currentAdminId: string }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [isListOpen, setIsListOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();

    const fetchAdmins = useCallback(async () => {
        setLoadingAdmins(true);
        const result = await getAdmins();
        if (result.admins) {
            setAdmins(result.admins);
        } else {
            toast({ title: t('toast.errorTitle'), description: result.error, variant: 'destructive' });
        }
        setLoadingAdmins(false);
    }, [toast, t]);

    useEffect(() => {
        if (isListOpen) {
            fetchAdmins();
        }
    }, [isListOpen, fetchAdmins]);
    
    const handleDelete = (admin: Admin) => {
       startSubmitting(async () => {
           const result = await deleteAdmin(admin.id);
           if (result.success) {
               toast({ title: t('toast.successTitle'), description: result.message });
               fetchAdmins();
           } else {
               toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
           }
       });
    };

    const handleSendEmail = (admin: Admin) => {
        startSubmitting(async () => {
            const result = await sendAdminFirstLoginEmail(admin);
             if (result.success) {
               toast({ title: t('toast.successTitle'), description: result.message });
           } else {
               toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
           }
        });
    }

    const onFormSuccess = () => {
        setIsFormOpen(false);
        fetchAdmins();
    };

    const handleEditClick = (admin: Admin) => {
        setSelectedAdmin(admin);
        setIsFormOpen(true);
    };

    const handleCreateClick = () => {
        setSelectedAdmin(null);
        setIsFormOpen(true);
    };

    return (
        <>
            <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
                <DialogTrigger asChild>
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>{t('adminDashboard.manageAdmins.title')}</span>
                    </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                     <div className={cn("relative transition-opacity", isSubmitting && "opacity-50")}>
                        {isSubmitting && <LoadingOverlay text={t('adminDashboard.loadingOverlay.processing')} />}
                        <DialogHeader>
                            <DialogTitle>{t('adminDashboard.manageAdmins.title')}</DialogTitle>
                            <DialogDescription>{t('adminDashboard.manageAdmins.listDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('adminDashboard.manageAdmins.table.name')}</TableHead>
                                        <TableHead>{t('adminDashboard.manageAdmins.table.email')}</TableHead>
                                        <TableHead>{t('adminDashboard.manageAdmins.table.permissions')}</TableHead>
                                        <TableHead><span className="sr-only">{t('adminDashboard.table.actions')}</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingAdmins ? (
                                        Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)
                                    ) : admins.map(admin => {
                                        const isSelf = admin.id === currentAdminId;
                                        return (
                                        <TableRow key={admin.id} className={cn(isSelf && "bg-muted/50")}>
                                            <TableCell>{admin.name} {isSelf && <span className="text-xs text-muted-foreground ml-1">({t('common.you')})</span>}</TableCell>
                                            <TableCell>{admin.email}</TableCell>
                                            <TableCell>{admin.can_create_admins ? t('adminDashboard.manageAdmins.canCreateAdminsLabel') : '---'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isSelf}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => handleEditClick(admin)}><Edit className="mr-2 h-4 w-4"/>{t('adminDashboard.table.edit')}</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleSendEmail(admin)}><Mail className="mr-2 h-4 w-4"/>{t('adminDashboard.manageAdmins.resendActivation')}</DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>{t('adminDashboard.table.delete')}</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>{t('adminDashboard.deleteCondoDialog.title')}</AlertDialogTitle>
                                                                    <AlertDialogDescription>{t('adminDashboard.manageAdmins.deleteConfirmation', {name: admin.name})}</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>{t('adminDashboard.newCondoDialog.cancel')}</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(admin)} className={buttonVariants({variant: 'destructive'})}>{t('adminDashboard.table.delete')}</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter className="sm:justify-between">
                            <DialogClose asChild><Button variant="outline">{t('common.close')}</Button></DialogClose>
                            <Button onClick={handleCreateClick}><UserPlus className="mr-2 h-4 w-4"/>{t('adminDashboard.manageAdmins.createButton')}</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <AdminFormDialog
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                admin={selectedAdmin}
                onSuccess={onFormSuccess}
            />
        </>
    )
}
