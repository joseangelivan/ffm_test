
"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Users,
  ShieldCheck,
  MoreVertical,
  Settings,
  Edit,
  KeyRound,
  Trash2,
  UserPlus,
  Loader,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUsersByCondoId, createUser, updateUser, deleteUser, type CondoUser } from '@/actions/users';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { LoadingOverlay } from '../admin/admin-header';

function UserForm({ 
    condoId, 
    user, 
    onSuccess 
}: { 
    condoId: string, 
    user: CondoUser | null, 
    onSuccess: () => void 
}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const isEditMode = !!user;
    const formAction = isEditMode ? updateUser : createUser;

    const handleAction = async (prevState: any, formData: FormData) => {
        const result = await formAction(prevState, formData);
        if (result.success) {
            toast({ title: t('toast.successTitle'), description: result.message });
            onSuccess();
        } else {
            toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
        }
        return result;
    }

    const [state, dispatch] = useActionState(handleAction, null);
    const { pending } = useFormStatus();

    return (
        <DialogContent className="sm:max-w-md">
            <form action={dispatch}>
                <div className={cn("relative transition-opacity", pending && "opacity-50")}>
                    {pending && <LoadingOverlay text={isEditMode ? t('adminDashboard.loadingOverlay.updating') : t('adminDashboard.loadingOverlay.creating')} />}
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? t('condoDashboard.users.editDialog.title') : t('condoDashboard.users.addUserButton')}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? t('condoDashboard.users.editDialog.description') : t('condoDashboard.users.createDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <input type="hidden" name="id" value={user?.id || ''} />

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('condoDashboard.users.table.name')}</Label>
                            <Input id="name" name="name" defaultValue={user?.name} required disabled={pending} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('condoDashboard.users.table.email')}</Label>
                            <Input id="email" name="email" type="email" defaultValue={user?.email} required disabled={pending} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type">{t('condoDashboard.users.table.type')}</Label>
                            <Select name="type" defaultValue={user?.type || 'resident'} required disabled={pending}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('login.selectUserType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="resident">{t('userTypes.resident')}</SelectItem>
                                    <SelectItem value="gatekeeper">{t('userTypes.gatekeeper')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('login.password')}</Label>
                            <Input id="password" name="password" type="password" required={!isEditMode} placeholder={isEditMode ? t('adminDashboard.smtp.passwordPlaceholderEdit') : ''} disabled={pending} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">{t('condoDashboard.users.manageDialog.location')}</Label>
                            <Input id="location" name="location" defaultValue={user?.location || ''} placeholder="Torre A, Sección 2" disabled={pending} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="housing">{t('condoDashboard.users.manageDialog.housing')}</Label>
                            <Input id="housing" name="housing" defaultValue={user?.housing || ''} placeholder="Apto 101" disabled={pending} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">{t('condoDashboard.users.manageDialog.phone')}</Label>
                            <Input id="phone" name="phone" defaultValue={user?.phone || ''} placeholder="+55 11 98765-4321" disabled={pending} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" type="button" disabled={pending}>{t('common.cancel')}</Button></DialogClose>
                        <Button type="submit" disabled={pending}>{t('common.saveChanges')}</Button>
                    </DialogFooter>
                </div>
            </form>
        </DialogContent>
    );
}

export default function ManageUsersTab({ condoId }: { condoId: string }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [users, setUsers] = useState<CondoUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<CondoUser | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const fetchedUsers = await getUsersByCondoId(condoId);
        setUsers(fetchedUsers);
        setIsLoading(false);
    }, [condoId]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenDialog = (user: CondoUser | null) => {
        setSelectedUser(user);
        setIsFormOpen(true);
    };

    const onFormSuccess = () => {
        setIsFormOpen(false);
        setSelectedUser(null);
        fetchUsers();
    };

    const handleDeleteUser = (user: CondoUser) => {
        startDeleteTransition(async () => {
            const result = await deleteUser(user.id, user.type);
            if (result.success) {
                toast({
                    title: t('toast.successTitle'),
                    description: t('condoDashboard.users.toast.userDeleted'),
                });
                fetchUsers();
            } else {
                 toast({
                    title: t('toast.errorTitle'),
                    description: result.message,
                    variant: 'destructive',
                });
            }
        });
    }

    const handleResetPassword = (userName: string) => {
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.users.toast.passwordReset', { name: userName })
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('condoDashboard.users.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.users.description')}</CardDescription>
                </div>
                <Button size="sm" className="gap-1" onClick={() => handleOpenDialog(null)}>
                    <UserPlus className="h-4 w-4" />
                    {t('condoDashboard.users.addUserButton')}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('condoDashboard.users.table.name')}</TableHead>
                            <TableHead>{t('condoDashboard.users.table.type')}</TableHead>
                            <TableHead>{t('condoDashboard.users.table.email')}</TableHead>
                            <TableHead><span className="sr-only">{t('condoDashboard.users.table.actions')}</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell>
                                </TableRow>
                            ))
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">{t('condoDashboard.users.noUsers')}</TableCell>
                            </TableRow>
                        ) : (
                            users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>
                                    <span className={`flex items-center gap-2 ${user.type === 'gatekeeper' ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {user.type === 'gatekeeper' ? <ShieldCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                        {t(`userTypes.${user.type}`)}
                                    </span>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" disabled={isDeleting}><MoreVertical className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleOpenDialog(user)}>
                                                <Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleResetPassword(user.name)}><KeyRound className="h-4 w-4 mr-2"/>{t('condoDashboard.users.table.resetPassword')}</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="h-4 w-4 mr-2"/>{t('condoDashboard.users.table.delete')}</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                             {t('condoDashboard.users.deleteConfirmation', {name: user.name})}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(user)} className={buttonVariants({variant: 'destructive'})}>
                                                            {t('common.delete')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )))}
                    </TableBody>
                </Table>
            </CardContent>

            {isFormOpen && (
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <UserForm condoId={condoId} user={selectedUser} onSuccess={onFormSuccess} />
                </Dialog>
            )}
        </Card>
    );
}
