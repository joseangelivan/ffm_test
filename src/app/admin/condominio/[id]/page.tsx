
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Eye,
  Star,
  Undo,
  Redo,
  Layers
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
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
    fillColor: '#3498db', // Blue
    strokeColor: '#2980b9'
};
const SAVED_COLOR = {
    fillColor: '#1ABC9C', // Turquoise
    strokeColor: '#16A085'
};
const VIEW_ALL_COLOR = {
    fillColor: '#95a5a6', // Gray
    strokeColor: '#7f8c8d'
};
const DEFAULT_COLOR = {
    fillColor: '#f39c12', // Orange
    strokeColor: '#e67e22'
};
const REF_COLOR = {
    fillColor: '#bdc3c7', // Silver
    strokeColor: '#95a5a6' // Gray
};

const getGeometryFromShape = (shape: google.maps.MVCObject | null): any | null => {
    if (!shape) return null;
    const shapeType = 'getPaths' in shape ? 'polygon' : 'getBounds' in shape ? 'rectangle' : 'getRadius' in shape ? 'circle' : null;
    
    switch (shapeType) {
        case 'polygon': {
            const path = (shape as google.maps.Polygon).getPath();
            return { type: 'polygon', paths: path.getArray().map((latLng: google.maps.LatLng) => ({ lat: latLng.lat(), lng: latLng.lng() })) };
        }
        case 'rectangle':
            return { type: 'rectangle', bounds: (shape as google.maps.Rectangle).getBounds()?.toJSON() };
        case 'circle':
            return { type: 'circle', center: (shape as google.maps.Circle).getCenter()?.toJSON(), radius: (shape as google.maps.Circle).getRadius() };
        default:
            return null;
    }
};

const createShapeFromGeometry = (geometry: any): google.maps.MVCObject | null => {
    if (!geometry) return null;
    
    let shape: google.maps.MVCObject | null = null;
    
    if (geometry.type === 'polygon' && Array.isArray(geometry.paths)) {
        shape = new google.maps.Polygon({ paths: geometry.paths });
    } else if (geometry.type === 'rectangle' && geometry.bounds) {
        shape = new google.maps.Rectangle({ bounds: geometry.bounds });
    } else if (geometry.type === 'circle' && geometry.center && geometry.radius) {
        shape = new google.maps.Circle({ center: geometry.center, radius: geometry.radius });
    }
    return shape;
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
    
    useEffect(() => {
        if (!map || !drawing) return;

        const newDrawingManager = new drawing.DrawingManager({
            drawingMode: drawing.OverlayType[drawingMode.toUpperCase() as keyof typeof google.maps.drawing.OverlayType],
            drawingControl: false,
            polygonOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1, suppressUndo: true },
            rectangleOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1, suppressUndo: true },
            circleOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1, suppressUndo: true },
        });
        
        newDrawingManager.setMap(map);

        const listener = (event: any) => {
            onOverlayComplete(event.overlay);
            newDrawingManager.setDrawingMode(null);
        };
        
        const overlayCompleteListener = google.maps.event.addListener(newDrawingManager, 'overlaycomplete', listener);

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
  const map = useMap();

  // Component State
  const [geofences, setGeofences] = useState<GeofenceObject[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  // Action State (Drawing, Editing)
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Undo/Redo State
  const [activeOverlay, setActiveOverlay] = useState<google.maps.MVCObject | null>(null);
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Active Module State
  const [activeModule, setActiveModule] = useState('geofence');

  const overlayListeners = useRef<google.maps.MapsEventListener[]>([]);

  const isActionActive = isDrawing || isEditing || isCreating;
  const isEditingShape = isEditing || isCreating;

  const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || "Ninguna";

  // --- History Management ---
  const updateHistory = useCallback((geometry: any) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(geometry);
    historyRef.current = newHistory;
    historyIndexRef.current++;
    
    setCanUndo(true);
    setCanRedo(false);
  }, []);
  
  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    historyIndexRef.current--;
    const previousGeometry = historyRef.current[historyIndexRef.current];
    const newShape = createShapeFromGeometry(previousGeometry);
    
    if (newShape) {
        setActiveOverlay(newShape);
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    
    historyIndexRef.current++;
    const nextGeometry = historyRef.current[historyIndexRef.current];
    const newShape = createShapeFromGeometry(nextGeometry);
    
    if (newShape) {
        setActiveOverlay(newShape);
    }

    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [canRedo]);
  
  // --- Shape Listeners ---
  const clearListeners = useCallback(() => {
    overlayListeners.current.forEach(l => l.remove());
    overlayListeners.current = [];
  }, []);

  const setupListeners = useCallback((shape: google.maps.MVCObject) => {
    clearListeners();
    const updateAndRecordHistory = () => {
        const newGeometry = getGeometryFromShape(shape);
        if (newGeometry) {
            updateHistory(newGeometry);
        }
    };
    
    let changedEvent = 'bounds_changed';
    if ('getRadius' in shape) changedEvent = 'radius_changed';
    if ('getPaths' in shape) {
        // @ts-ignore
        const path = shape.getPath();
        overlayListeners.current.push(google.maps.event.addListener(path, 'set_at', updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(path, 'insert_at', updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(path, 'remove_at', updateAndRecordHistory));
    } else {
        overlayListeners.current.push(google.maps.event.addListener(shape, changedEvent, updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(shape, 'dragend', updateAndRecordHistory));
    }
  }, [updateHistory, clearListeners]);

  // --- Main Effects ---

  // Cleanup effect
  useEffect(() => {
    return () => {
        clearListeners();
        // @ts-ignore
        if (activeOverlay) activeOverlay.setMap(null);
    }
  }, [clearListeners, activeOverlay]);

  // Effect to manage active overlay and its listeners
  useEffect(() => {
    geofences.forEach(gf => {
      // @ts-ignore
      if (gf.shape) gf.shape.setMap(null);
    });
    // @ts-ignore
    if(activeOverlay) activeOverlay.setMap(null);
    
    if (activeOverlay && isEditingShape) {
      // @ts-ignore
      activeOverlay.setOptions({ ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, editable: true, draggable: true, zIndex: 2, suppressUndo: true });
      // @ts-ignore
      activeOverlay.setMap(map);
      setupListeners(activeOverlay);
    } else {
        clearListeners();
    }
    
  }, [activeOverlay, isEditingShape, map, setupListeners, clearListeners]);

  // Effect to manage geofence visibility
  useEffect(() => {
    geofences.forEach(gf => {
        const isDefault = gf.id === defaultGeofenceId;
        const isSelected = gf.id === selectedGeofenceId;
        let visible = false;
        let options: any = {};

        if (isEditingShape && isSelected) {
            visible = false; // Hide original while editing
        } else if (isEditingEnabled) {
            if (isSelected) {
                visible = true;
                options = { 
                    fillColor: isDefault ? DEFAULT_COLOR.fillColor : SAVED_COLOR.fillColor,
                    strokeColor: isDefault ? DEFAULT_COLOR.strokeColor : SAVED_COLOR.strokeColor,
                    fillOpacity: 0.4, strokeWeight: 3, zIndex: 1
                };
            }
        } else {
            if (viewAll) {
                visible = true;
                options = {
                    fillColor: isDefault ? DEFAULT_COLOR.fillColor : VIEW_ALL_COLOR.fillColor,
                    strokeColor: isDefault ? DEFAULT_COLOR.strokeColor : VIEW_ALL_COLOR.strokeColor,
                    fillOpacity: isDefault ? 0.4 : 0.2, strokeWeight: isDefault ? 3 : 1,
                    zIndex: isDefault ? 2 : 1
                };
            } else if (isDefault) {
                visible = true;
                options = {
                    fillColor: DEFAULT_COLOR.fillColor, strokeColor: DEFAULT_COLOR.strokeColor,
                    fillOpacity: 0.4, strokeWeight: 2, zIndex: 1
                };
            }
        }
        // @ts-ignore
        gf.shape.setOptions({ ...options, editable: false, draggable: false, map: visible ? map : null });
    });
  }, [isEditingEnabled, viewAll, geofences, selectedGeofenceId, defaultGeofenceId, isEditingShape, map]);

  // --- Action Handlers ---
  const resetActionStates = useCallback(() => {
    if (activeOverlay) {
        // @ts-ignore
        activeOverlay.setMap(null);
    }
    setIsDrawing(false);
    setIsEditing(false);
    setIsCreating(false);
    setActiveOverlay(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
    clearListeners();
  }, [activeOverlay, clearListeners]);

  const handleOverlayComplete = useCallback((overlay: google.maps.MVCObject) => {
    setIsDrawing(false);
    setIsCreating(true);
    setActiveOverlay(overlay);
    updateHistory(getGeometryFromShape(overlay));
    toast({
        title: "Forma Dibujada",
        description: "Ahora puedes guardar la geocerca para este condominio."
    });
  }, [toast, updateHistory]);

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

    const geometryToSave = getGeometryFromShape(activeOverlay);
    const shapeToSave = createShapeFromGeometry(geometryToSave);
    
    if (!shapeToSave) {
        toast({ title: "Error", description: "No se pudo clonar la forma para guardar.", variant: "destructive"});
        return;
    }
    
    if (isCreating) { // Saving new
        const newId = `gf-${Date.now()}`;
        const newName = getNextGeofenceName();
        const newGeofence: GeofenceObject = { id: newId, name: newName, shape: shapeToSave };
        
        setGeofences(prev => {
          const newGeofences = [...prev, newGeofence];
          if(newGeofences.length === 1) setDefaultGeofenceId(newId);
          return newGeofences;
        });

        setSelectedGeofenceId(newId);
        toast({ title: "Geocerca Guardada", description: `La geocerca "${newName}" se ha guardado.`});

    } else if (isEditing && selectedGeofenceId) { // Editing existing
        setGeofences(prev => prev.map(g => 
            g.id === selectedGeofenceId 
            ? {...g, shape: shapeToSave} 
            : g
        ));
        toast({ title: "Geocerca Actualizada" });
    }

    resetActionStates();
  };

  const handleStartEdit = () => {
    if (!selectedGeofenceId) return;
    const geofenceToEdit = geofences.find(g => g.id === selectedGeofenceId);
    if (!geofenceToEdit) return;

    const geometry = getGeometryFromShape(geofenceToEdit.shape);
    const shape = createShapeFromGeometry(geometry);
    
    if (!shape) {
        toast({ title: "Error", description: "No se pudo clonar la forma para editar.", variant: "destructive"});
        return;
    }
    
    resetActionStates();
    setIsEditing(true);
    setActiveOverlay(shape);
    updateHistory(geometry);
  }
  
  const handleToggleDrawing = () => {
    if(isActionActive) {
        resetActionStates();
    } else {
        resetActionStates();
        setIsDrawing(true);
    }
  }

  const handleDelete = () => {
      if (!selectedGeofenceId) return;
      const idToDelete = selectedGeofenceId;
      
      const geofenceToDelete = geofences.find(g => g.id === idToDelete);
      // @ts-ignore
      if (geofenceToDelete) geofenceToDelete.shape.setMap(null);

      setGeofences(prev => {
        const newGeofences = prev.filter(g => g.id !== idToDelete);
        
        if(idToDelete === defaultGeofenceId) {
            setDefaultGeofenceId(newGeofences.length > 0 ? newGeofences[0].id : null);
        }
        
        if (idToDelete === selectedGeofenceId) {
             setSelectedGeofenceId(newGeofences.length > 0 ? newGeofences[0].id : null);
        }

        return newGeofences;
      });

      if (isEditing || isCreating) resetActionStates();
      toast({ title: "Geocerca Eliminada", variant: "destructive" });
  }

  const handleSetAsDefault = () => {
    if (!selectedGeofenceId) return;
    setDefaultGeofenceId(selectedGeofenceId);
    toast({ title: "Geocerca por Defecto", description: "Se ha establecido la geocerca seleccionada como predeterminada."});
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
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle>{t('condoDashboard.map.title')}</CardTitle>
                 <CardDescription>{t('condoDashboard.map.description')}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[70vh]">
            <div className="w-2/3 p-1">
                 <div className="h-full w-full bg-muted overflow-hidden relative shadow-inner rounded-md border">
                   <MapComponent center={center} zoom={15}>
                       {isDrawing && (
                           <DrawingManager 
                               onOverlayComplete={handleOverlayComplete} 
                               drawingMode={drawingMode} 
                           />
                       )}
                   </MapComponent>
                   {isEditingShape && (canUndo || canRedo) && (
                     <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 p-1 rounded-md shadow-lg flex gap-1 backdrop-blur-sm">
                        <Button onClick={handleUndo} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canUndo}>
                            <Undo className="h-4 w-4"/>
                            {t('condoDashboard.map.undo')}
                        </Button>
                        <Button onClick={handleRedo} variant="ghost" size="sm" className="flex items-center gap-2" disabled={!canRedo}>
                            <Redo className="h-4 w-4"/>
                            {t('condoDashboard.map.redo')}
                        </Button>
                     </div>
                   )}
                </div>
            </div>
            <div className="w-1/3 p-1">
                <div className="relative border h-full p-4 pt-2 bg-card rounded-md">
                    <h2 className="text-lg font-semibold tracking-tight px-2 absolute -top-3.5 left-4 bg-card">Módulos del Mapa</h2>
                     <div className="flex-1 flex flex-col space-y-4 pt-4">
                        <div className="px-1 flex items-center gap-2">
                            <Label htmlFor="module-select" className="shrink-0">Módulo:</Label>
                            <Select value={activeModule} onValueChange={setActiveModule}>
                                <SelectTrigger id="module-select">
                                    <SelectValue placeholder="Seleccionar módulo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="geofence">Geocerca</SelectItem>
                                    <SelectItem value="elements">Elementos del mapa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {activeModule === 'geofence' && (
                         <div className="space-y-4 pt-2 border-t">
                             <h3 className="text-base font-semibold">Geocerca</h3>
                             <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="default-geofence">Geocerca Predeterminada</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="view-all" checked={viewAll} onCheckedChange={(checked) => setViewAll(!!checked)} disabled={isEditingEnabled}/>
                                        <label htmlFor="view-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Ver Todas
                                        </label>
                                    </div>
                                </div>
                                <div className="relative flex items-center">
                                    {defaultGeofenceId && (
                                        <Star className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500 fill-orange-400" />
                                    )}
                                    <Input id="default-geofence" value={defaultGeofenceName} readOnly disabled className="pl-8"/>
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-2">
                                 <div className="flex items-center space-x-2">
                                    <Checkbox id="enable-editing" checked={isEditingEnabled} onCheckedChange={(checked) => setIsEditingEnabled(!!checked)}/>
                                    <label htmlFor="enable-editing" className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Edición
                                    </label>
                                </div>

                                <fieldset disabled={!isEditingEnabled} className="space-y-4">
                                     <div className="flex items-center gap-2">
                                           <Select value={selectedGeofenceId || ''} onValueChange={id => { if(!isActionActive) setSelectedGeofenceId(id) }} disabled={isActionActive}>
                                                <SelectTrigger className={cn("flex-1", isEditingShape && "text-[#2980b9] border-[#2980b9] font-bold")}>
                                                    <SelectValue placeholder="Seleccionar geocerca" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {geofences.map(gf => (
                                                        <SelectItem key={gf.id} value={gf.id}>
                                                            <div className='flex items-center gap-2'>
                                                                {gf.id === defaultGeofenceId && <Star className="h-4 w-4 text-orange-500 fill-orange-400" />}
                                                                <span>{gf.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                           </Select>
                                           <div className="flex items-center">
                                                <Button variant="ghost" size="icon" onClick={handleSetAsDefault} disabled={isActionActive || !selectedGeofenceId}>
                                                    <Star className={cn("h-4 w-4", defaultGeofenceId === selectedGeofenceId && "fill-orange-400 text-orange-500")} />
                                                    <span className="sr-only">Establecer como Default</span>
                                                </Button>
                                               <Button variant="ghost" size="icon" onClick={handleStartEdit} disabled={isActionActive || !selectedGeofenceId}>
                                                   <Edit className="h-4 w-4"/>
                                                   <span className="sr-only">Editar</span>
                                               </Button>
                                                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isActionActive || !selectedGeofenceId}>
                                                   <Trash2 className="h-4 w-4 text-destructive"/>
                                                   <span className="sr-only">Eliminar</span>
                                               </Button>
                                           </div>
                                       </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button onClick={handleToggleDrawing} variant={isActionActive ? "destructive" : "outline"} className="flex-1">
                                            <PencilRuler className="mr-2 h-4 w-4"/>
                                            {isActionActive ? 'Cancelar' : 'Dibujar'}
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-40 justify-between" disabled={isActionActive}>
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
                                    
                                     {isEditingShape && (
                                        <Button onClick={handleSaveGeofence} className="w-full">
                                            <Save className="mr-2 h-4 w-4" /> {isCreating ? 'Guardar Geocerca' : 'Guardar Cambios'}
                                        </Button>
                                    )}
                                </fieldset>
                            </div>
                         </div>
                        )}
                        {activeModule === 'elements' && (
                             <div className="space-y-4 pt-2 border-t">
                                <h3 className="text-base font-semibold">Elementos del Mapa</h3>
                                <div className="flex items-center justify-center text-center p-4 h-48 border-2 border-dashed rounded-md">
                                    <p className="text-muted-foreground">Aquí se gestionarán los elementos del mapa.</p>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function CondominioDashboardPage({ params }: { params: { id: string } }) {
  const { t } = useLocale();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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
          <Tabs defaultValue="map">
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
              {apiKey ? (
                 <APIProvider apiKey={apiKey} libraries={['drawing']}>
                    <CondoMapTab center={condo.location} />
                 </APIProvider>
              ) : (
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
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
