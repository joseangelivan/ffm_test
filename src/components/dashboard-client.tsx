
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car,
  ChevronDown,
  Eye,
  Languages,
  Laptop,
  LogOut,
  MapPin,
  PlusCircle,
  Settings,
  Smartphone,
  Trash2,
  User,
  Watch,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type Device = {
  id: string;
  name: string;
  type: 'smartphone' | 'watch' | 'laptop' | 'car' | 'esp32' | 'other';
  status: 'Online' | 'Offline';
  lastLocation: string;
  battery: number | null;
};

type User = {
  name: string;
  email: string;
  avatarUrl: string;
};

const deviceIcons = {
  smartphone: <Smartphone className="h-5 w-5 text-muted-foreground" />,
  watch: <Watch className="h-5 w-5 text-muted-foreground" />,
  laptop: <Laptop className="h-5 w-5 text-muted-foreground" />,
  car: <Car className="h-5 w-5 text-muted-foreground" />,
  esp32: (
    <svg
      className="h-5 w-5 text-muted-foreground"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M12 15v6" />
      <path d="M12 3v6" />
      <path d="M18 9h2" />
      <path d="M4 9H2" />
      <path d="M8 9h1" />
      <path d="M15 9h1" />
    </svg>
  ),
  other: <MapPin className="h-5 w-5 text-muted-foreground" />,
};

function AddDeviceDialog({
  onDeviceAdd,
}: {
  onDeviceAdd: (device: Omit<Device, 'id' | 'status' | 'lastLocation' | 'battery'>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Device['type']>('smartphone');
  const { toast } = useToast();
  const { t } = useLocale();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.addDeviceError'),
        variant: 'destructive',
      });
      return;
    }
    onDeviceAdd({ name, type });
    toast({
      title: t('toast.successTitle'),
      description: t('toast.addDeviceSuccess', { name }),
    });
    setOpen(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('dashboard.addDevice')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('addDeviceDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('addDeviceDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('addDeviceDialog.nameLabel')}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mi iPhone 15"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                {t('addDeviceDialog.typeLabel')}
              </Label>
              <Select onValueChange={(v: Device['type']) => setType(v)} defaultValue={type}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('addDeviceDialog.selectTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smartphone">{t('deviceTypes.smartphone')}</SelectItem>
                  <SelectItem value="watch">{t('deviceTypes.watch')}</SelectItem>
                  <SelectItem value="laptop">{t('deviceTypes.laptop')}</SelectItem>
                  <SelectItem value="car">{t('deviceTypes.car')}</SelectItem>
                  <SelectItem value="esp32">{t('deviceTypes.esp32')}</SelectItem>
                  <SelectItem value="other">{t('deviceTypes.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">{t('addDeviceDialog.registerButton')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 items-center border-b px-4 md:px-6 shrink-0">
        <Skeleton className="h-8 w-48" />
        <div className="ml-auto flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-video w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function DashboardClient({
  user,
  devices: initialDevices,
}: {
  user: User;
  devices: Device[];
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(
    initialDevices.find(d => d.status === 'Online') || initialDevices[0] || null
  );

  const { toast } = useToast();
  const { t, setLocale, locale } = useLocale();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!selectedDevice || selectedDevice.status === 'Offline') return;

    const intervalId = setInterval(() => {
      setDevices(prevDevices =>
        prevDevices.map(d => {
          if (d.id === selectedDevice.id) {
            const [lat, lon] = d.lastLocation.split(',').map(s => parseFloat(s.trim()));
            const newLat = lat + (Math.random() - 0.5) * 0.001;
            const newLon = lon + (Math.random() - 0.5) * 0.001;
            const newLocation = `${newLat.toFixed(6)}, ${newLon.toFixed(6)}`;
            
            setSelectedDevice(prevSelected => prevSelected && prevSelected.id === d.id ? { ...prevSelected, lastLocation: newLocation } : prevSelected);

            return { ...d, lastLocation: newLocation };
          }
          return d;
        })
      );
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedDevice]);

  const handleAddDevice = (newDevice: Omit<Device, 'id' | 'status' | 'lastLocation' | 'battery'>) => {
    const deviceToAdd: Device = {
      ...newDevice,
      id: `dev-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Offline',
      lastLocation: '0, 0',
      battery: null,
    };
    setDevices(prev => [...prev, deviceToAdd]);
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    toast({
      title: t('toast.deviceRemovedTitle'),
      description: t('toast.deviceRemovedDescription'),
    });
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(devices.find(d => d.id !== deviceId) || null);
    }
  };

  const handleSetSelectedDevice = (device: Device) => {
    setSelectedDevice(device);
    toast({
      title: t('toast.deviceSelectedTitle'),
      description: t('toast.deviceSelectedDescription', { name: device.name }),
    });
  }

  const handleLogout = () => {
    router.push('/');
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <Logo />
        <div className="flex-1">
          <h1 className="text-lg font-semibold md:text-2xl font-headline">{t('dashboard.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AlertDialog>
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="avatar" />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('dashboard.profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('dashboard.settings')}</span>
                  </DropdownMenuItem>
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
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle className="font-headline">
                  {t('dashboard.mapTitle')}: {selectedDevice ? selectedDevice.name : t('dashboard.noDeviceSelected')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.mapDescription')}
                  {selectedDevice && (
                    <span className="block font-mono text-sm text-primary mt-1">
                      {t('dashboard.coords')}: {selectedDevice.lastLocation}
                       {selectedDevice.status === 'Online' && <span className="ml-2 inline-flex items-center gap-1.5 animate-pulse text-green-600"><span className="h-2 w-2 rounded-full bg-green-500"></span>{t('deviceStatus.live')}</span>}
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden relative shadow-inner">
                 <Image
                    src="https://placehold.co/1200x800.png"
                    alt="Map view of tracked device"
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="map satellite"
                  />
                  {selectedDevice && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <MapPin className="h-10 w-10 text-accent drop-shadow-lg animate-bounce" />
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="grid gap-2">
                <CardTitle className="font-headline">{t('dashboard.myDevices')}</CardTitle>
                <CardDescription>{t('dashboard.myDevicesDescription')}</CardDescription>
              </div>
              <AddDeviceDialog onDeviceAdd={handleAddDevice} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('deviceTable.device')}</TableHead>
                    <TableHead>{t('deviceTable.status')}</TableHead>
                    <TableHead className="text-right">{t('deviceTable.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id} className={cn(selectedDevice?.id === device.id && "bg-accent/10")}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {deviceIcons[device.type as keyof typeof deviceIcons] || deviceIcons.other}
                          <div>
                            <div className="font-medium">{device.name}</div>
                            {device.battery !== null && (
                              <div className="text-sm text-muted-foreground">
                                {t('deviceTable.battery')}: {device.battery}%
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={device.status === 'Online' ? 'default' : 'secondary'}
                          className={cn(device.status === 'Online' && "bg-green-500/80 text-white")}
                        >
                          {t(`deviceStatus.${device.status.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" onClick={() => handleSetSelectedDevice(device)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t('deviceTable.viewOnMap')}</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(device.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                             <span className="sr-only">{t('deviceTable.delete')}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                   {devices.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                            {t('deviceTable.noDevices')}
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

    