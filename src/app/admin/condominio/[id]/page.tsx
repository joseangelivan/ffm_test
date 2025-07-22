
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Building,
  Smartphone,
  Trash2,
  PlusCircle,
  Users,
  ShieldCheck,
  MoreVertical,
  Edit,
  KeyRound,
  UserPlus,
  Map,
  Settings,
  Copy,
  Home,
  Phone,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock data
const mockCondoDetails = {
  id: 'condo-001',
  name: 'Residencial Jardins',
  address: 'Rua das Flores, 123',
};

const mockDevices = [
  { id: 'dev-01', name: 'Tracker Portão 1', type: 'esp32', status: 'Online', token: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8' },
  { id: 'dev-02', name: 'Câmera Corredor A', type: 'other', status: 'Online', token: 'b2c3d4e5-f6g7-8901-h2i3-j4k5l6m7n8o9' },
  { id: 'dev-03', name: 'Relógio Segurança', type: 'watch', status: 'Offline', token: 'c3d4e5f6-g7h8-9012-i3j4-k5l6m7n8o9p0' },
];

const mockUsers = [
  { id: 'user-01', name: 'João da Silva', type: 'Residente', email: 'joao@email.com', location: 'Torre A, Sección 2', housing: 'Apto 101', phone: '+55 11 98765-4321' },
  { id: 'user-02', name: 'Maria Oliveira', type: 'Residente', email: 'maria@email.com', location: 'Casa 15', housing: 'Lote 3', phone: '+55 21 91234-5678' },
  { id: 'user-03', name: 'Carlos-Portería', type: 'Portería', email: 'porteria.jardins@email.com', location: 'Garita Principal', housing: 'N/A', phone: '+55 11 99999-8888' },
];

type User = typeof mockUsers[0];
type Device = typeof mockDevices[0];

function ManageUsersTab({ initialUsers }: { initialUsers: User[] }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [users, setUsers] = useState(initialUsers);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editedUser, setEditedUser] = useState<Partial<User>>({});

    const handleOpenEditDialog = (user: User) => {
        setSelectedUser(user);
        setEditedUser({ name: user.name, type: user.type, email: user.email });
        setIsEditDialogOpen(true);
    };

    const handleOpenManageDialog = (user: User) => {
        setSelectedUser(user);
        setIsManageDialogOpen(true);
    };

    const handleSaveChanges = () => {
        if (!selectedUser) return;
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editedUser } as User : u));
        toast({
            title: t('toast.successTitle'),
            description: "Usuario actualizado con éxito."
        });
        setIsEditDialogOpen(false);
        setSelectedUser(null);
    };

    const handleDeleteUser = (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.users.toast.userDeleted'),
        });
    }

    const handleResetPassword = (userName: string) => {
        toast({
            title: t('toast.successTitle'),
            description: `Se ha enviado un enlace para restablecer la contraseña a ${userName}.`
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('condoDashboard.users.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.users.description')}</CardDescription>
                </div>
                <Button size="sm" className="gap-1">
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
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>
                                    <span className={`flex items-center gap-2 ${user.type === 'Portería' ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {user.type === 'Portería' ? <ShieldCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                        {t(`userTypes.${user.type.toLowerCase()}`)}
                                    </span>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleOpenManageDialog(user)}>
                                                <Settings className="h-4 w-4 mr-2"/>Gestionar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleOpenEditDialog(user)}>
                                                <Edit className="h-4 w-4 mr-2"/>Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleResetPassword(user.name)}><KeyRound className="h-4 w-4 mr-2"/>{t('condoDashboard.users.table.resetPassword')}</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2"/>{t('condoDashboard.users.table.delete')}</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Modifica la información básica del usuario.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" value={editedUser.name || ''} onChange={(e) => setEditedUser({...editedUser, name: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={editedUser.email || ''} onChange={(e) => setEditedUser({...editedUser, email: e.target.value})} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="type">Tipo de Usuario</Label>
                            <Select value={editedUser.type || ''} onValueChange={(value) => setEditedUser({...editedUser, type: value})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Residente">{t('userTypes.residente')}</SelectItem>
                                    <SelectItem value="Portería">{t('userTypes.portería')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage User Dialog */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gestionar Usuario</DialogTitle>
                        <DialogDescription>
                            Administrar detalles y permisos para {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Información Adicional</h3>
                            <div className="flex items-center gap-4">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Ubicación</p>
                                    <p className="text-sm text-muted-foreground">{selectedUser?.location}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Home className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Vivienda</p>
                                    <p className="text-sm text-muted-foreground">{selectedUser?.housing}</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-4">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Teléfono</p>
                                    <p className="text-sm text-muted-foreground">{selectedUser?.phone}</p>
                                </div>
                            </div>
                         </div>
                         <div className="space-y-4 pt-4 mt-4 border-t">
                            <h3 className="font-semibold text-lg">Acciones</h3>
                             <Button variant="outline" className="w-full justify-start" onClick={() => selectedUser && handleResetPassword(selectedUser.name)}>
                                <KeyRound className="h-4 w-4 mr-2"/>
                                {t('condoDashboard.users.table.resetPassword')}
                            </Button>
                         </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function ManageDevicesTab({ initialDevices }: { initialDevices: Device[] }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [devices, setDevices] = useState(initialDevices);

    const handleDeleteDevice = (deviceId: string) => {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.devices.toast.deviceDeleted'),
        });
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.devices.toast.tokenCopied'),
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('condoDashboard.devices.title')}</CardTitle>
                    <CardDescription>{t('condoDashboard.devices.description')}</CardDescription>
                </div>
                 <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    {t('condoDashboard.devices.addDeviceButton')}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('condoDashboard.devices.table.name')}</TableHead>
                            <TableHead>{t('condoDashboard.devices.table.type')}</TableHead>
                            <TableHead>{t('condoDashboard.devices.table.status')}</TableHead>
                            <TableHead><span className="sr-only">{t('condoDashboard.devices.table.actions')}</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {devices.map(device => (
                             <TableRow key={device.id}>
                                <TableCell className="font-medium">{device.name}</TableCell>
                                <TableCell>{device.type}</TableCell>
                                <TableCell>{device.status}</TableCell>
                                <TableCell className="text-right">
                                    <Dialog>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <Settings className="h-4 w-4 mr-2"/>{t('adminDashboard.table.manage')}
                                                    </DropdownMenuItem>
                                                </DialogTrigger>
                                                <DropdownMenuItem><Edit className="h-4 w-4 mr-2"/>{t('adminDashboard.table.edit')}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteDevice(device.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2"/>{t('adminDashboard.table.delete')}</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t('condoDashboard.devices.manageDialog.title', { name: device.name })}</DialogTitle>
                                                <DialogDescription>{t('condoDashboard.devices.manageDialog.description')}</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-6 py-4">
                                                <div>
                                                    <h3 className="font-semibold mb-2">{t('condoDashboard.devices.manageDialog.serverConfigTitle')}</h3>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`websocket-url-${device.id}`}>{t('condoDashboard.devices.manageDialog.websocketUrl')}</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input id={`websocket-url-${device.id}`} value="wss://your-followforme-server.com/ws" readOnly />
                                                            <Button variant="outline" size="icon" onClick={() => copyToClipboard('wss://your-followforme-server.com/ws')}><Copy className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                 <div>
                                                    <h3 className="font-semibold mb-2">{t('condoDashboard.devices.manageDialog.deviceTokenTitle')}</h3>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`device-token-${device.id}`}>{t('condoDashboard.devices.manageDialog.deviceToken')}</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input id={`device-token-${device.id}`} value={device.token} readOnly />
                                                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(device.token)}><Copy className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" asChild>
                                                    <DialogTrigger>{t('common.close')}</DialogTrigger>
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function CondoMapTab() {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
            <CardDescription>{t('condoDashboard.map.description')}</CardDescription>
          </div>
          <div className="w-full sm:w-64">
             <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue placeholder={t('condoDashboard.map.selectMapPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t('condoDashboard.map.defaultOSM')}</SelectItem>
                  <SelectItem value="custom1">{t('condoDashboard.map.customMap1')}</SelectItem>
                  <SelectItem value="custom2">{t('condoDashboard.map.customMap2')}</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden relative shadow-inner">
            <Image
                src="https://placehold.co/1200x800.png"
                alt="Vista de mapa del condominio"
                layout="fill"
                objectFit="cover"
                data-ai-hint="map openstreetmap"
            />
        </div>
      </CardContent>
    </Card>
  );
}


export default function CondominioDashboardPage({ params }: { params: { id: string } }) {
  const { t } = useLocale();
  
  // In a real app, you'd fetch condo details based on params.id
  const condo = mockCondoDetails;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="grid gap-4">
          <div>
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {t('condoDashboard.backToAdmin')}
            </Link>
            <div className="flex items-center gap-4 mt-2">
                <Building className="h-8 w-8 text-primary"/>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{condo.name}</h1>
                    <p className="text-muted-foreground">{condo.address}</p>
                </div>
            </div>
          </div>
          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4"/>{t('condoDashboard.tabs.users')}</TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2"><Smartphone className="h-4 w-4"/>{t('condoDashboard.tabs.devices')}</TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2"><Map className="h-4 w-4"/>{t('condoDashboard.tabs.map')}</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-4">
              <ManageUsersTab initialUsers={mockUsers} />
            </TabsContent>
            <TabsContent value="devices" className="mt-4">
              <ManageDevicesTab initialDevices={mockDevices} />
            </TabsContent>
             <TabsContent value="map" className="mt-4">
              <CondoMapTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
