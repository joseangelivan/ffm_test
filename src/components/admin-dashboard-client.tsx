

"use client";

import React, { useState, useEffect, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Building,
  PlusCircle,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Smartphone,
  Shield,
  UserPlus,
  Eye,
  LogOut,
  Settings,
  User,
  Languages,
  Moon,
  Sun,
  Loader,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { handleLogoutAction, getSettings, updateSettings, createAdmin } from '@/actions/auth';
import { createCondominio, getCondominios, updateCondominio, deleteCondominio, type Condominio } from '@/actions/condos';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Checkbox } from './ui/checkbox';


type Session = {
    id: string;
    email: string;
    name: string;
    canCreateAdmins: boolean;
    type: 'admin' | 'resident' | 'gatekeeper';
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

function CreateAdminSubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLocale();

    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {t('adminDashboard.manageAdmins.createButton')}
        </Button>
    )
}

function LoadingOverlay() {
    const { t } = useLocale();
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-4 text-2xl text-muted-foreground">
                <Loader className="h-12 w-12 animate-spin" />
                <span>{t('adminDashboard.loadingOverlay.creating')}</span>
            </div>
        </div>
    );
}

function ManageAdminsForm({closeDialog}: {closeDialog: () => void}) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [state, formAction] = useActionState(createAdmin, undefined);
    const { pending } = useFormStatus();
    
    useEffect(() => {
        if (state?.success === false) {
            toast({
                title: t('toast.errorTitle'),
                description: state.message,
                variant: 'destructive'
            });
        }
        if (state?.success === true) {
            toast({
                title: t('toast.successTitle'),
                description: state.message
            });
            closeDialog();
        }
    }, [state, t, toast, closeDialog]);

    return (
        <form action={formAction}>
            <div className={cn("relative transition-opacity", pending && "opacity-50")}>
                {pending && <LoadingOverlay />}
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.manageAdmins.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.manageAdmins.description')}</DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    {state?.success === false && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('adminDashboard.manageAdmins.nameLabel')}</Label>
                        <Input id="name" name="name" placeholder="John Doe" required disabled={pending}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('adminDashboard.manageAdmins.emailLabel')}</Label>
                        <Input id="email" name="email" type="email" placeholder="admin@example.com" required autoComplete="email" disabled={pending}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">{t('adminDashboard.manageAdmins.passwordLabel')}</Label>
                        <Input id="password" name="password" type="password" required autoComplete="new-password" disabled={pending}/>
                    </div>
                    <div className="flex items-center space-x-2">
                       <Checkbox id="can_create_admins" name="can_create_admins" disabled={pending}/>
                       <Label htmlFor="can_create_admins" className="text-sm font-normal">
                            {t('adminDashboard.manageAdmins.canCreateAdminsLabel')}
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={pending}>{t('adminDashboard.newCondoDialog.cancel')}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={pending}>
                        {t('adminDashboard.manageAdmins.createButton')}
                    </Button>
                </DialogFooter>
            </div>
        </form>
    )
}

function ManageAdminsDialog() {
    const { t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>{t('adminDashboard.manageAdmins.title')}</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <ManageAdminsForm closeDialog={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

export default function AdminDashboardClient({ session }: { session: Session }) {
  const { t, setLocale, locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isNewCondoDialogOpen, setIsNewCondoDialogOpen] = useState(false);
  const [newCondoName, setNewCondoName] = useState('');
  const [newCondoAddress, setNewCondoAddress] = useState('');

  const [isEditCondoDialogOpen, setIsEditCondoDialogOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condominio | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const fetchCondos = async () => {
      setLoading(true);
      const result = await getCondominios();
      if(result.success && result.data) {
          setCondominios(result.data);
      } else {
          toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
      }
      setLoading(false);
  }

  useEffect(() => {
    fetchCondos();
  }, []);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings();
      if (settings) {
          setTheme(settings.theme);
          setLocale(settings.language);
          document.documentElement.classList.toggle('dark', settings.theme === 'dark');
      }
    }
    loadSettings();
  }, [setLocale]);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    await updateSettings({ theme: newTheme });
  }

  const handleSetLocale = async (newLocale: 'es' | 'pt') => {
      setLocale(newLocale);
      await updateSettings({ language: newLocale });
  }

  const handleCreateCondominio = async (formData: FormData) => {
    const result = await createCondominio(formData);
    if (result.success) {
      toast({
        title: t('toast.successTitle'),
        description: result.message,
      });
      setIsNewCondoDialogOpen(false);
      setNewCondoName('');
      setNewCondoAddress('');
      fetchCondos(); // Refetch list
    } else {
      toast({
        title: t('toast.errorTitle'),
        description: result.message,
        variant: 'destructive',
      });
    }
    return result;
  };

  const handleEditCondo = async (formData: FormData) => {
    if (!editingCondo) return;
    formData.append('id', editingCondo.id);
    
    const result = await updateCondominio(formData);
    if (result.success) {
        toast({
            title: t('toast.successTitle'),
            description: result.message,
        });
        setIsEditCondoDialogOpen(false);
        setEditingCondo(null);
        fetchCondos();
    } else {
        toast({
            title: t('toast.errorTitle'),
            description: result.message,
            variant: 'destructive',
        });
    }
  };
  
  const handleDeleteCondo = async (condoId: string) => {
    const result = await deleteCondominio(condoId);
     if (result.success) {
        toast({
            title: t('toast.successTitle'),
            description: result.message,
        });
        fetchCondos();
    } else {
        toast({
            title: t('toast.errorTitle'),
            description: result.message,
            variant: 'destructive',
        });
    }
  }

  const openEditDialog = (condo: Condominio) => {
    setEditingCondo(condo);
    setIsEditCondoDialogOpen(true);
  };
  
  const navigateToCondo = (condoId: string) => {
    router.push(`/admin/condominio/${condoId}`);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary"/>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">{t('adminDashboard.title')}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <AlertDialog>
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
                            {session.canCreateAdmins && <ManageAdminsDialog />}
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>{t('dashboard.logout')}</span>
                      </DropdownMenuItem>
                  </AlertDialogTrigger>
              </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <form action={handleLogoutAction}>
                    <LogoutDialogContent />
                </form>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('adminDashboard.condoListTitle')}</CardTitle>
                <CardDescription>{t('adminDashboard.condoListDescription')}</CardDescription>
              </div>
              <Dialog open={isNewCondoDialogOpen} onOpenChange={setIsNewCondoDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    {t('adminDashboard.createCondoButton')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form action={handleCreateCondominio}>
                    <DialogHeader>
                      <DialogTitle>{t('adminDashboard.newCondoDialog.title')}</DialogTitle>
                      <DialogDescription>{t('adminDashboard.newCondoDialog.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">{t('adminDashboard.newCondoDialog.nameLabel')}</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Ex: Residencial Jardins"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="address">{t('adminDashboard.newCondoDialog.addressLabel')}</Label>
                        <Input
                          id="address"
                          name="address"
                          placeholder="Ex: Rua das Flores, 123"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">{t('adminDashboard.newCondoDialog.cancel')}</Button>
                      </DialogClose>
                      <Button type="submit">{t('adminDashboard.newCondoDialog.create')}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('adminDashboard.table.condo')}</TableHead>
                    <TableHead>{t('adminDashboard.table.devices')}</TableHead>
                    <TableHead>{t('adminDashboard.table.residents')}</TableHead>
                    <TableHead>{t('adminDashboard.table.gatekeepers')}</TableHead>
                    <TableHead>
                      <span className="sr-only">{t('adminDashboard.table.actions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell colSpan={5} className="p-4">
                                <Skeleton className="h-10 w-full" />
                            </TableCell>
                        </TableRow>
                    ))
                  ) : condominios.map((condo) => (
                    <TableRow key={condo.id} >
                      <TableCell>
                        <div className="font-medium">{condo.name}</div>
                        <div className="text-sm text-muted-foreground">{condo.address}</div>
                      </TableCell>
                      <TableCell>{condo.devices_count || 0}</TableCell>
                      <TableCell>{condo.residents_count || 0}</TableCell>
                      <TableCell>{condo.gatekeepers_count || 0}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">{t('adminDashboard.table.toggleMenu')}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => navigateToCondo(condo.id)}>
                                <Eye className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEditDialog(condo)}>
                                <Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}
                            </DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('adminDashboard.deleteCondoDialog.title')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('adminDashboard.deleteCondoDialog.description', {name: condo.name})}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('adminDashboard.newCondoDialog.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCondo(condo.id)} className={buttonVariants({variant: 'destructive'})}>
                                            {t('adminDashboard.table.delete')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Condo Dialog */}
      {editingCondo && (
        <Dialog open={isEditCondoDialogOpen} onOpenChange={setIsEditCondoDialogOpen}>
            <DialogContent>
            <form action={handleEditCondo}>
                <DialogHeader>
                    <DialogTitle>{t('adminDashboard.editCondoDialog.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.editCondoDialog.description')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                    <Label htmlFor="name">{t('adminDashboard.newCondoDialog.nameLabel')}</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={editingCondo.name}
                        required
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="address">{t('adminDashboard.newCondoDialog.addressLabel')}</Label>
                    <Input
                        id="address"
                        name="address"
                        defaultValue={editingCondo.address}
                        required
                    />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{t('adminDashboard.newCondoDialog.cancel')}</Button>
                    </DialogClose>
                    <Button type="submit">{t('adminDashboard.editCondoDialog.save')}</Button>
                </DialogFooter>
            </form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
