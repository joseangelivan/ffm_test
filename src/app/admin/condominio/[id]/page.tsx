
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Building2,
  PencilRuler,
  CheckCircle,
  ChevronDown,
  Save,
  Eye
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
import { APIProvider, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import MapComponent from '@/components/map';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


// Mock data
const mockCondoDetails = {
  id: 'condo-001',
  name: 'Residencial Jardins',
  address: 'Rua das Flores, 123',
  location: { lat: -23.5505, lng: -46.6333 }
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
        setEditedUser({ 
            location: user.location, 
            housing: user.housing, 
            phone: user.phone 
        });
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
        setIsManageDialogOpen(false);
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
                            <div className="grid gap-2">
                                <Label htmlFor="location">Ubicación</Label>
                                <Input id="location" value={editedUser.location || ''} onChange={(e) => setEditedUser({...editedUser, location: e.target.value})} placeholder="Torre A, Sección 2" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="housing">Vivienda</Label>
                                <Input id="housing" value={editedUser.housing || ''} onChange={(e) => setEditedUser({...editedUser, housing: e.target.value})} placeholder="Apto 101" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input id="phone" value={editedUser.phone || ''} onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})} placeholder="+55 11 98765-4321" />
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
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
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

// Geofence Types
type DrawingMode = 'polygon' | 'rectangle' | 'circle';
type GeofenceObject = {
    id: string;
    name: string;
    shape: google.maps.MVCObject;
};

// Colors for Geofences
const EDIT_COLOR = {
    fill: '#3498db',
    stroke: '#2980b9'
};
const SAVED_COLOR = {
    fill: '#1ABC9C',
    stroke: '#16A085'
};
const VIEW_ALL_COLOR = {
    fill: '#95a5a6',
    stroke: '#7f8c8d'
};

const RenderedGeofence = ({ 
    geofence, 
    isBeingEdited, 
    viewAll, 
    onUpdate 
}: { 
    geofence: GeofenceObject, 
    isBeingEdited: boolean, 
    viewAll: boolean,
    onUpdate: (newShape: google.maps.MVCObject) => void;
}) => {
    const map = useMap();
    const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
    const [rectangle, setRectangle] = useState<google.maps.Rectangle | null>(null);
    const [circle, setCircle] = useState<google.maps.Circle | null>(null);

    const isVisible = isBeingEdited || viewAll;
    
    const options = {
        fillColor: isBeingEdited ? EDIT_COLOR.fill : SAVED_COLOR.fill,
        strokeColor: isBeingEdited ? EDIT_COLOR.stroke : SAVED_COLOR.stroke,
        fillOpacity: isBeingEdited ? 0.3 : viewAll ? 0.2 : 0.4,
        strokeWeight: isBeingEdited ? 2 : viewAll ? 1 : 3,
        editable: isBeingEdited,
        draggable: isBeingEdited,
    };
    
    useEffect(() => {
        const shape = geofence.shape;
        if (!map || !shape) return;

        // @ts-ignore
        shape.setMap(isVisible ? map : null);
        // @ts-ignore
        shape.setOptions(options);

        const listeners: google.maps.MapsEventListener[] = [];
        
        const addListener = (event: string, handler: (e: any) => void) => {
            // @ts-ignore
            listeners.push(google.maps.event.addListener(shape, event, handler));
        };
        
        if (isBeingEdited) {
            const updateShape = () => onUpdate(shape);
            
            if (shape instanceof google.maps.Polygon) {
                addListener('dragend', updateShape);
                // @ts-ignore
                addListener('mouseup', updateShape); // For path changes
            } else if (shape instanceof google.maps.Rectangle) {
                addListener('bounds_changed', updateShape);
            } else if (shape instanceof google.maps.Circle) {
                addListener('center_changed', updateShape);
                addListener('radius_changed', updateShape);
            }
        }

        return () => {
             listeners.forEach(l => l.remove());
        }

    }, [map, geofence, isBeingEdited, viewAll, options]);
    
    return null; // The shapes are rendered via the Google Maps API directly, not React components
};


const DrawingManager = ({
    onOverlayComplete,
    drawingMode,
}: {
    onOverlayComplete: (overlay: google.maps.MVCObject) => void;
    drawingMode: DrawingMode;
}) => {
    const map = useMap();
    const drawing = useMapsLibrary('drawing');
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);

    useEffect(() => {
        if (!map || !drawing) return;

        const newDrawingManager = new drawing.DrawingManager({
            drawingMode: drawing.OverlayType[drawingMode.toUpperCase() as keyof typeof google.maps.drawing.OverlayType],
            drawingControl: false,
            polygonOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
            rectangleOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
            circleOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
        });
        
        newDrawingManager.setMap(map);

        const listener = (event: any) => {
            onOverlayComplete(event.overlay);
            newDrawingManager.setDrawingMode(null);
            event.overlay.setMap(null); // Hide the overlay from drawing manager, we will render it ourselves
        };
        
        const overlayCompleteListener = google.maps.event.addListener(newDrawingManager, 'overlaycomplete', listener);

        setDrawingManager(newDrawingManager);

        return () => {
            google.maps.event.removeListener(overlayCompleteListener);
            newDrawingManager.setMap(null);
        };
    }, [map, drawing, onOverlayComplete, drawingMode]);

    return null;
};


function CondoMapTab({ center }: { center: { lat: number; lng: number } }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [geofences, setGeofences] = useState<GeofenceObject[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
  const [activeOverlay, setActiveOverlay] = useState<google.maps.MVCObject | null>(null);
  
  const [viewAll, setViewAll] = useState(true);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);

  const isDrawing = activeOverlay !== null && editingGeofenceId === null;
  const isEditing = editingGeofenceId !== null;

  const handleOverlayComplete = useCallback((overlay: google.maps.MVCObject) => {
    setActiveOverlay(overlay);
    toast({
        title: "Forma Dibujada",
        description: "Ahora puedes guardar la geocerca para este condominio."
    });
  }, [toast]);
  
  const getNextGeofenceName = () => {
      const existingNumbers = geofences.map(g => {
          const match = g.name.match(/^Geocerca_(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
      }).filter(n => n > 0).sort((a,b) => a-b);
      
      let nextNumber = 1;
      for (const num of existingNumbers) {
          if (num === nextNumber) {
              nextNumber++;
          } else {
              break;
          }
      }
      return `Geocerca_${String(nextNumber).padStart(2, '0')}`;
  }

  const handleSaveGeofence = () => {
      if (!activeOverlay) return;

      const newId = `gf-${Date.now()}`;
      const newName = getNextGeofenceName();
      
      const newGeofence: GeofenceObject = {
          id: newId,
          name: newName,
          shape: activeOverlay
      };
      
      setGeofences(prev => [...prev, newGeofence]);
      setActiveOverlay(null);
      
      toast({
          title: "Geocerca Guardada",
          description: `La geocerca "${newName}" se ha guardado correctamente.`
      });
  };
  
  const handleSaveChanges = () => {
    if(!editingGeofenceId || !activeOverlay) return;
    
    setGeofences(prev => prev.map(g => g.id === editingGeofenceId ? {...g, shape: activeOverlay} : g));
    
    toast({
        title: "Geocerca Actualizada",
        description: "Los cambios en la geocerca se han guardado."
    });
    setEditingGeofenceId(null);
    setActiveOverlay(null);
  }

  const handleEdit = (geofence: GeofenceObject) => {
    if (activeOverlay) { // Cancel any ongoing drawing/editing
        // @ts-ignore
        activeOverlay.setMap(null);
    }
    setActiveOverlay(geofence.shape);
    setEditingGeofenceId(geofence.id);
  }

  const handleDelete = (idToDelete: string) => {
      if (editingGeofenceId === idToDelete) {
          setEditingGeofenceId(null);
          setActiveOverlay(null);
      }
      setGeofences(prev => prev.filter(g => g.id !== idToDelete));
      toast({ title: "Geocerca Eliminada", variant: "destructive" });
  }
  
  const handleToggleDrawing = () => {
      if(isDrawing || isEditing) { // Cancel drawing/editing
          if(activeOverlay) {
            // @ts-ignore
            activeOverlay.setMap(null);
          }
          setActiveOverlay(null);
          setEditingGeofenceId(null);
      } else {
        // Start drawing - overlay will be set on complete
      }
  }

  if (!apiKey) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                <CardDescription>API Key for Google Maps is missing.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                    <p>Google Maps could not be loaded.</p>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex h-[70vh]">
            <div className="w-2/3 border-r">
                <div className="h-full bg-muted overflow-hidden relative shadow-inner">
                    <APIProvider apiKey={apiKey} libraries={['drawing']}>
                        <MapComponent center={center} zoom={15}>
                            {geofences.map(gf => (
                                <RenderedGeofence 
                                    key={gf.id}
                                    geofence={gf}
                                    isBeingEdited={editingGeofenceId === gf.id}
                                    viewAll={viewAll}
                                    onUpdate={(newShape) => setActiveOverlay(newShape)}
                                />
                            ))}
                            {(isDrawing || isEditing) && (
                                <DrawingManager 
                                    onOverlayComplete={handleOverlayComplete} 
                                    drawingMode={drawingMode} 
                                />
                            )}
                            {isDrawing && activeOverlay && <RenderedGeofence geofence={{id: 'temp', name: 'temp', shape: activeOverlay}} isBeingEdited={true} viewAll={true} onUpdate={() => {}} />}
                        </MapComponent>
                    </APIProvider>
                </div>
            </div>
            <div className="w-1/3 p-4 space-y-4 overflow-y-auto">
                <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-semibold text-lg">Geocerca</h3>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleToggleDrawing} variant={isDrawing || isEditing ? "destructive" : "outline"} className="flex-1">
                            <PencilRuler className="mr-2 h-4 w-4"/>
                            {isDrawing ? 'Cancelar Dibujo' : isEditing ? 'Cancelar Edición' : 'Dibujar'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-40 justify-between" disabled={isDrawing || isEditing}>
                                <span>
                                        {drawingMode === 'polygon' && 'Polígono'}
                                        {drawingMode === 'rectangle' && 'Rectángulo'}
                                        {drawingMode === 'circle' && 'Círculo'}
                                </span>
                                <ChevronDown className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => setDrawingMode('polygon')}>Polígono</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDrawingMode('rectangle')}>Rectángulo</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDrawingMode('circle')}>Círculo</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                     {isDrawing && (
                        <Button onClick={handleSaveGeofence} disabled={!activeOverlay} className="w-full">
                            <Save className="mr-2 h-4 w-4" /> Guardar Geocerca
                        </Button>
                    )}
                    {isEditing && (
                        <Button onClick={handleSaveChanges} className="w-full">
                            <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                        </Button>
                    )}
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="view-all" checked={viewAll} onCheckedChange={(checked) => setViewAll(!!checked)} />
                        <label htmlFor="view-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Ver Todas
                        </label>
                    </div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                     <h3 className="font-semibold text-lg">Selección y Edición</h3>
                     {geofences.length === 0 ? (
                         <p className="text-sm text-muted-foreground text-center py-4">No hay geocercas guardadas.</p>
                     ) : (
                        <div className="space-y-2">
                            {geofences.map(gf => (
                                <div key={gf.id} className={cn(
                                    "flex items-center justify-between p-2 rounded-md",
                                    editingGeofenceId === gf.id ? "bg-blue-100 dark:bg-blue-900" : "bg-muted/50"
                                )}>
                                    <span className="font-medium">{gf.name}</span>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(gf)} disabled={isDrawing || (isEditing && editingGeofenceId !== gf.id)}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                         <Button variant="ghost" size="icon" onClick={() => handleDelete(gf.id)} disabled={isDrawing || isEditing}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            </div>
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
              <CondoMapTab center={condo.location} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

    