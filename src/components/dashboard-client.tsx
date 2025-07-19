"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Car,
  ChevronDown,
  Eye,
  Laptop,
  LogOut,
  Map,
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
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  other: <Map className="h-5 w-5 text-muted-foreground" />,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    onDeviceAdd({ name, type });
    toast({
      title: 'Success',
      description: `Device "${name}" has been registered.`,
    });
    setOpen(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Register a New Device</DialogTitle>
            <DialogDescription>
              Enter the details of your new device to start tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My iPhone 15"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select onValueChange={(v: Device['type']) => setType(v)} defaultValue={type}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a device type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smartphone">Smartphone</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="esp32">ESP32/IoT Device</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Register Device</Button>
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
            
            // Also update the selected device state if it's the one being updated
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
      title: "Device Removed",
      description: "The device has been successfully removed from your list.",
    });
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(devices.find(d => d.id !== deviceId) || null);
    }
  };

  const handleSetSelectedDevice = (device: Device) => {
    setSelectedDevice(device);
    toast({
      title: 'Device Selected',
      description: `Now tracking "${device.name}" on the map.`,
    });
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <Logo />
        <div className="flex-1">
          <h1 className="text-lg font-semibold md:text-2xl font-headline">Dashboard</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
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
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle className="font-headline">
                  Live Map: {selectedDevice ? selectedDevice.name : 'No device selected'}
                </CardTitle>
                <CardDescription>
                  Real-time location of your selected device.
                  {selectedDevice && (
                    <span className="block font-mono text-sm text-primary mt-1">
                      Coords: {selectedDevice.lastLocation}
                       {selectedDevice.status === 'Online' && <span className="ml-2 inline-flex items-center gap-1.5 animate-pulse text-green-600"><span className="h-2 w-2 rounded-full bg-green-500"></span>Live</span>}
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
                <CardTitle className="font-headline">My Devices</CardTitle>
                <CardDescription>Manage and track your registered devices.</CardDescription>
              </div>
              <AddDeviceDialog onDeviceAdd={handleAddDevice} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id} className={cn(selectedDevice?.id === device.id && "bg-accent/10")}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {deviceIcons[device.type]}
                          <div>
                            <div className="font-medium">{device.name}</div>
                            {device.battery !== null && (
                              <div className="text-sm text-muted-foreground">
                                Battery: {device.battery}%
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
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" onClick={() => handleSetSelectedDevice(device)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View on map</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(device.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                             <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                   {devices.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                            No devices registered yet.
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
