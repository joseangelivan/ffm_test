
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
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
  UserPlus
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';

// Mock data
const mockCondoDetails = {
  id: 'condo-001',
  name: 'Residencial Jardins',
  address: 'Rua das Flores, 123',
};

const mockDevices = [
  { id: 'dev-01', name: 'Tracker Portão 1', type: 'esp32', status: 'Online' },
  { id: 'dev-02', name: 'Câmera Corredor A', type: 'other', status: 'Online' },
  { id: 'dev-03', name: 'Relógio Segurança', type: 'watch', status: 'Offline' },
];

const mockUsers = [
  { id: 'user-01', name: 'João da Silva', type: 'Morador', email: 'joao@email.com' },
  { id: 'user-02', name: 'Maria Oliveira', type: 'Morador', email: 'maria@email.com' },
  { id: 'user-03', name: 'Carlos-Portaria', type: 'Portaria', email: 'portaria.jardins@email.com' },
];

type User = typeof mockUsers[0];
type Device = typeof mockDevices[0];


function ManageUsersTab({ initialUsers }: { initialUsers: User[] }) {
    const { t } = useLocale();
    const { toast } = useToast();
    const [users, setUsers] = useState(initialUsers);

    const handleDeleteUser = (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast({
            title: t('toast.successTitle'),
            description: t('condoDashboard.users.toast.userDeleted'),
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
                                    <span className={`flex items-center gap-2 ${user.type === 'Portaria' ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {user.type === 'Portaria' ? <ShieldCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                        {user.type}
                                    </span>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem><KeyRound className="h-4 w-4 mr-2"/>{t('condoDashboard.users.table.resetPassword')}</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2"/>{t('condoDashboard.users.table.delete')}</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
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
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(device.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
            <TabsList>
              <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4"/>{t('condoDashboard.tabs.users')}</TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2"><Smartphone className="h-4 w-4"/>{t('condoDashboard.tabs.devices')}</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-4">
              <ManageUsersTab initialUsers={mockUsers} />
            </TabsContent>
            <TabsContent value="devices" className="mt-4">
              <ManageDevicesTab initialDevices={mockDevices} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
