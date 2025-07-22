
"use client";

import React, { useState, useEffect } from 'react';
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
import { Logo } from './logo';
import { LanguageSwitcher } from './language-switcher';

type Condominio = {
  id: string;
  name: string;
  address: string;
  devices: number;
  residents: number;
  doormen: number;
};

const mockAdmin = {
    name: "Admin Geral",
    email: "admin@followforme.com",
    avatarUrl: "https://placehold.co/100x100.png"
}

export default function AdminDashboardClient({ initialCondominios }: { initialCondominios: Condominio[] }) {
  const { t, setLocale, locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [condominios, setCondominios] = useState<Condominio[]>(initialCondominios);
  
  // State for new condo dialog
  const [isNewCondoDialogOpen, setIsNewCondoDialogOpen] = useState(false);
  const [newCondoName, setNewCondoName] = useState('');
  const [newCondoAddress, setNewCondoAddress] = useState('');

  // State for edit condo dialog
  const [isEditCondoDialogOpen, setIsEditCondoDialogOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condominio | null>(null);
  const [editCondoName, setEditCondoName] = useState('');
  const [editCondoAddress, setEditCondoAddress] = useState('');

  useEffect(() => {
    if (editingCondo) {
      setEditCondoName(editingCondo.name);
      setEditCondoAddress(editingCondo.address);
    } else {
      setEditCondoName('');
      setEditCondoAddress('');
    }
  }, [editingCondo]);

  const handleCreateCondominio = () => {
    if (!newCondoName || !newCondoAddress) {
      toast({
        title: t('toast.errorTitle'),
        description: t('adminDashboard.toast.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }
    const newCondo: Condominio = {
      id: `condo-${Math.random().toString(36).substr(2, 9)}`,
      name: newCondoName,
      address: newCondoAddress,
      devices: 0,
      residents: 0,
      doormen: 0,
    };
    setCondominios(prev => [...prev, newCondo]);
    toast({
      title: t('toast.successTitle'),
      description: t('adminDashboard.toast.condoCreated', { name: newCondoName }),
    });
    setNewCondoName('');
    setNewCondoAddress('');
    setIsNewCondoDialogOpen(false);
  };

  const handleEditCondo = () => {
    if (!editingCondo || !editCondoName || !editCondoAddress) {
      toast({
        title: t('toast.errorTitle'),
        description: t('adminDashboard.toast.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }
    setCondominios(prev =>
      prev.map(c =>
        c.id === editingCondo.id ? { ...c, name: editCondoName, address: editCondoAddress } : c
      )
    );
    toast({
        title: t('toast.successTitle'),
        description: t('adminDashboard.editCondoDialog.toast.condoUpdated'),
    });
    setEditingCondo(null);
    setIsEditCondoDialogOpen(false);
  };
  
  const handleDeleteCondo = (condoId: string) => {
    setCondominios(prev => prev.filter(c => c.id !== condoId));
    toast({
      title: t('toast.successTitle'),
      description: t('adminDashboard.toast.condoDeleted'),
    });
  }

  const openEditDialog = (condo: Condominio) => {
    setEditingCondo(condo);
    setIsEditCondoDialogOpen(true);
  };
  
  const navigateToCondo = (condoId: string) => {
    router.push(`/admin/condominio/${condoId}`);
  };

  const handleLogout = () => {
    router.push('/');
  }

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
                      <AvatarImage src={mockAdmin.avatarUrl} alt={mockAdmin.name} data-ai-hint="avatar" />
                      <AvatarFallback>{mockAdmin.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{mockAdmin.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{mockAdmin.email}</p>
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
                                        <DropdownMenuItem onClick={() => setLocale('es')}>
                                        Español {locale === 'es' && <span className="ml-auto">✓</span>}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setLocale('pt')}>
                                        Português {locale === 'pt' && <span className="ml-auto">✓</span>}
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
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
                  <AlertDialogHeader>
                      <AlertDialogTitle>{t('dashboard.logoutConfirmation.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                          {t('dashboard.logoutConfirmation.description')}
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>{t('dashboard.logoutConfirmation.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>{t('dashboard.logoutConfirmation.confirm')}</AlertDialogAction>
                  </AlertDialogFooter>
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
                  <DialogHeader>
                    <DialogTitle>{t('adminDashboard.newCondoDialog.title')}</DialogTitle>
                    <DialogDescription>{t('adminDashboard.newCondoDialog.description')}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="condo-name">{t('adminDashboard.newCondoDialog.nameLabel')}</Label>
                      <Input
                        id="condo-name"
                        value={newCondoName}
                        onChange={(e) => setNewCondoName(e.target.value)}
                        placeholder="Ex: Residencial Jardins"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="condo-address">{t('adminDashboard.newCondoDialog.addressLabel')}</Label>
                      <Input
                        id="condo-address"
                        value={newCondoAddress}
                        onChange={(e) => setNewCondoAddress(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewCondoDialogOpen(false)}>{t('adminDashboard.newCondoDialog.cancel')}</Button>
                    <Button onClick={handleCreateCondominio}>{t('adminDashboard.newCondoDialog.create')}</Button>
                  </DialogFooter>
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
                  {condominios.map((condo) => (
                    <TableRow key={condo.id} >
                      <TableCell>
                        <div className="font-medium">{condo.name}</div>
                        <div className="text-sm text-muted-foreground">{condo.address}</div>
                      </TableCell>
                      <TableCell>{condo.devices}</TableCell>
                      <TableCell>{condo.residents}</TableCell>
                      <TableCell>{condo.doormen}</TableCell>
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
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteCondo(condo.id)}>
                                <Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}
                            </DropdownMenuItem>
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
      <Dialog open={isEditCondoDialogOpen} onOpenChange={setIsEditCondoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminDashboard.editCondoDialog.title')}</DialogTitle>
            <DialogDescription>{t('adminDashboard.editCondoDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-condo-name">{t('adminDashboard.newCondoDialog.nameLabel')}</Label>
              <Input
                id="edit-condo-name"
                value={editCondoName}
                onChange={(e) => setEditCondoName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-condo-address">{t('adminDashboard.newCondoDialog.addressLabel')}</Label>
              <Input
                id="edit-condo-address"
                value={editCondoAddress}
                onChange={(e) => setEditCondoAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCondoDialogOpen(false)}>{t('adminDashboard.newCondoDialog.cancel')}</Button>
            <Button onClick={handleEditCondo}>{t('adminDashboard.editCondoDialog.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
