
"use client";

import React, 'use client';
import { useState, useEffect } from 'react';
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
  Moon,
  PlusCircle,
  Settings,
  Smartphone,
  Sun,
  Trash2,
  User,
  Watch,
  Loader
} from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import MapComponent, { type Marker } from '@/components/map';
import type { SessionPayload } from '@/lib/session';
import type { Device } from '@/actions/devices';

const deviceIcons: { [key: string]: React.ReactNode } = {
  'Teléfono Inteligente': <Smartphone className="h-5 w-5 text-muted-foreground" />,
  'Smartphone': <Smartphone className="h-5 w-5 text-muted-foreground" />,
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
  onDeviceAdd: (device: Omit<Device, 'id' | 'status' | 'lastLocation' | 'battery' | 'condominium_id' | 'device_type_id' | 'token' | 'created_at' | 'updated_at' | 'device_type_name_translations'> & { type: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('smartphone');
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
              <Select onValueChange={(v: string) => setType(v)} defaultValue={type}>
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
  user: SessionPayload;
  devices: Device[];
}) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(
    initialDevices[0] || null
  );
  
  const { toast } = useToast();
  const { t, setLocale, locale } = useLocale();
  const router = useRouter();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    // This effect can be simplified as we now receive props directly
  }, []);


  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    // This would require a server action to persist theme for a user
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }

  const handleSetLocale = async (newLocale: 'es' | 'pt-BR') => {
      // This would require a server action to persist locale for a user
      setLocale(newLocale);
  }

  useEffect(() => {
    if (!selectedDevice) return;

    const intervalId = setInterval(() => {
      setDevices(prevDevices =>
        prevDevices.map(d => {
          if (d.id === selectedDevice.id) {
            // Mocking movement for now
            return { ...d };
          }
          return d;
        })
      );
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedDevice]);

  const handleAddDevice = (newDevice: Omit<Device, 'id' | 'status' | 'lastLocation' | 'battery' | 'condominium_id' | 'device_type_id' | 'token' | 'created_at' | 'updated_at' | 'device_type_name_translations'> & {type: string}) => {
    // This should call a server action to create a device
    toast({
      title: "Función no implementada",
      description: "La creación de dispositivos se manejará en un próximo paso.",
      variant: "destructive"
    });
  };

  const handleDeleteDevice = (deviceId: string) => {
    // This should call a server action to delete a device
    toast({
      title: "Función no implementada",
      description: "La eliminación de dispositivos se manejará en un próximo paso.",
      variant: "destructive"
    });
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
  
  const mapCenter = selectedDevice 
    ? { lat: 40.7128, lng: -74.0060 } // Placeholder
    : { lat: 40.7128, lng: -74.0060 }; // Default center if no device selected

  const mapMarkers: Marker[] = devices
    .map(device => {
        return {
            id: device.id,
            position: { lat: 40.7128, lng: -74.0060 }, // Placeholder
            label: device.name,
            isActive: device.id === selectedDevice?.id
        };
    })
    .filter((marker): marker is Marker => marker !== null);


  if (!user) {
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
            <AlertDialog>
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://placehold.co/100x100.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="avatar" />
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
                                        <DropdownMenuItem onClick={() => handleSetLocale('pt-BR')}>
                                        Português {locale === 'pt-BR' && <span className="ml-auto">✓</span>}
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
                      {t('dashboard.coords')}: { /* selectedDevice.lastLocation */ }
                       { /* selectedDevice.status === 'Online' && */ <span className="ml-2 inline-flex items-center gap-1.5 animate-pulse text-green-600"><span className="h-2 w-2 rounded-full bg-green-500"></span>{t('deviceStatus.live')}</span>}
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden relative shadow-inner">
                 {!apiKey ? (
                    <div className="flex items-center justify-center h-full">
                        <p>API Key for Google Maps is missing.</p>
                    </div>
                 ) : (
                    <APIProvider apiKey={apiKey}>
                        <MapComponent center={mapCenter} markers={mapMarkers} />
                    </APIProvider>
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
                  {devices.map((device) => {
                    const deviceTypeName = device.device_type_name_translations[locale] || device.device_type_name_translations['pt-BR'];
                    return (
                        <TableRow key={device.id} className={cn(selectedDevice?.id === device.id && "bg-accent/10")}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                            {deviceIcons[deviceTypeName] || deviceIcons.other}
                            <div>
                                <div className="font-medium">{device.name}</div>
                                <div className="text-xs text-muted-foreground">{deviceTypeName}</div>
                            </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge
                            variant={'secondary'}
                            >
                            {t(`deviceStatus.offline`)}
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
                    )
                  })}
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
