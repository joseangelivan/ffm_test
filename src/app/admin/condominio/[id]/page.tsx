
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
  Redo
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
    shape: google.maps.MVCObject; // This will hold the google.maps.Polygon, Rectangle, or Circle object
};

const getGeometryFromShape = (shape: google.maps.MVCObject | null): any | null => {
    if (!shape) return null;
    // @ts-ignore
    const shapeType = shape.getPaths ? 'polygon' : shape.getBounds ? 'rectangle' : 'circle';

    switch (shapeType) {
        case 'polygon':
            // @ts-ignore
            return shape.getPaths().getArray().map(path => path.getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() })));
        case 'rectangle':
             // @ts-ignore
            return shape.getBounds()?.toJSON();
        case 'circle':
             // @ts-ignore
            return { center: shape.getCenter()?.toJSON(), radius: shape.getRadius() };
        default:
            return null;
    }
};

const cloneShape = (shape: google.maps.MVCObject): google.maps.MVCObject | null => {
    if (!google?.maps) return null;
    
    // @ts-ignore
    const shapeType = shape.getPaths ? 'polygon' : shape.getBounds ? 'rectangle' : 'circle';

    const geometry = getGeometryFromShape(shape);
    if (!geometry) return null;

    switch (shapeType) {
        case 'polygon': {
            return new google.maps.Polygon({ paths: geometry });
        }
        case 'rectangle': {
            return new google.maps.Rectangle({ bounds: geometry });
        }
        case 'circle': {
            return new google.maps.Circle({ center: geometry.center, radius: geometry.radius });
        }
        default:
            return null;
    }
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
            polygonOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
            rectangleOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
            circleOptions: { ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
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

function CondoMapTab({ center }: { center: { lat: number; lng: number } }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const map = useMap();

  const [geofences, setGeofences] = useState<GeofenceObject[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('polygon');
  
  // States for UI control
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [defaultGeofenceId, setDefaultGeofenceId] = useState<string | null>(null);
  
  // States for actions (drawing, editing)
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<google.maps.MVCObject | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const overlayListeners = useRef<google.maps.MapsEventListener[]>([]);
  
  const isCreating = isDrawingMode || (activeOverlay && !isEditing);
  const isActionActive = isDrawingMode || activeOverlay !== null;

  const defaultGeofenceName = geofences.find(g => g.id === defaultGeofenceId)?.name || "Ninguna";
  
  const updateHistory = useCallback((newShape: any) => {
    setHistory(currentHistory => {
        const newHistorySlice = currentHistory.slice(0, historyIndex + 1);
        const newHistory = [...newHistorySlice, newShape];
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  }, [historyIndex]);

  const applyHistoryState = useCallback((geometry: any) => {
    if (!activeOverlay || !geometry) return;
    
    // @ts-ignore
    const shapeType = activeOverlay.getPaths ? 'polygon' : activeOverlay.getBounds ? 'rectangle' : 'circle';

    switch (shapeType) {
        case 'polygon':
            // @ts-ignore
            activeOverlay.setPaths(geometry);
            break;
        case 'rectangle':
             // @ts-ignore
            activeOverlay.setBounds(geometry);
            break;
        case 'circle':
             // @ts-ignore
            activeOverlay.setCenter(geometry.center);
            // @ts-ignore
            activeOverlay.setRadius(geometry.radius);
            break;
    }
  }, [activeOverlay]);

  const handleUndo = useCallback(() => {
    setHistoryIndex(prevIndex => {
        if (prevIndex > 0) {
            const newIndex = prevIndex - 1;
            // Use a timeout to ensure the state update has propagated before applying
            setTimeout(() => applyHistoryState(history[newIndex]), 0);
            return newIndex;
        }
        return prevIndex;
    });
  }, [history, applyHistoryState]);
  
  const handleRedo = useCallback(() => {
    setHistoryIndex(prevIndex => {
       if (prevIndex < history.length - 1) {
           const newIndex = prevIndex + 1;
           // Use a timeout to ensure the state update has propagated before applying
           setTimeout(() => applyHistoryState(history[newIndex]), 0);
           return newIndex;
       }
       return prevIndex;
    });
  }, [history, applyHistoryState]);


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

    // @ts-ignore
    if (shape.getPaths) { // Polygon
        // @ts-ignore
        const paths = shape.getPaths();
        overlayListeners.current.push(google.maps.event.addListener(paths, 'set_at', updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(paths, 'insert_at', updateAndRecordHistory));
        overlayListeners.current.push(google.maps.event.addListener(paths, 'remove_at', updateAndRecordHistory));
    } else { // Rectangle and Circle
        // @ts-ignore
        overlayListeners.current.push(google.maps.event.addListener(shape, 'bounds_changed', updateAndRecordHistory));
        // @ts-ignore
        overlayListeners.current.push(google.maps.event.addListener(shape, 'radius_changed', updateAndRecordHistory)); // Circle specific
    }
  }, [updateHistory, clearListeners]);

  useEffect(() => {
    if (activeOverlay && isEditing) {
        setupListeners(activeOverlay);
    } else {
        clearListeners();
    }
    return clearListeners;
  }, [activeOverlay, isEditing, clearListeners, setupListeners]);


  const resetActionStates = useCallback((overlayToClean?: google.maps.MVCObject | null) => {
    const overlay = overlayToClean || activeOverlay;
    if (overlay) {
        // @ts-ignore
        overlay.setMap(null);
    }
    
    setIsDrawingMode(false);
    setIsEditing(false);
    setActiveOverlay(null);
    setHistory([]);
    setHistoryIndex(-1);
    clearListeners();
  }, [activeOverlay, clearListeners]);

  const handleOverlayComplete = useCallback((overlay: google.maps.MVCObject) => {
    setIsDrawingMode(false);
    // @ts-ignore
    overlay.setOptions({ ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, editable: true, draggable: true, zIndex: 2 });
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

  const handleSaveNewGeofence = () => {
    if (!activeOverlay) return;

    const newId = `gf-${Date.now()}`;
    const newName = getNextGeofenceName();
    
    const clonedShape = cloneShape(activeOverlay);
    if (!clonedShape) {
        toast({ title: "Error", description: "No se pudo clonar la forma para guardar.", variant: "destructive"});
        return;
    }

    const newGeofence: GeofenceObject = {
        id: newId,
        name: newName,
        shape: clonedShape
    };
    
    setGeofences(prev => {
      const newGeofences = [...prev, newGeofence];
      if(newGeofences.length === 1) {
          setDefaultGeofenceId(newId);
      }
      return newGeofences;
    });

    setSelectedGeofenceId(newId);
    resetActionStates(activeOverlay);
    
    toast({
        title: "Geocerca Guardada",
        description: `La geocerca "${newName}" se ha guardado correctamente.`
    });
  };
  
  const handleSaveChanges = () => {
    if(!activeOverlay || !isEditing || !selectedGeofenceId) return;

    const originalGeofence = geofences.find(g => g.id === selectedGeofenceId);
    if (originalGeofence) {
        // @ts-ignore
        originalGeofence.shape.setMap(null);
    }
    
    const clonedActiveOverlay = cloneShape(activeOverlay); 
    if (!clonedActiveOverlay) {
        toast({ title: "Error", description: "No se pudo guardar la forma.", variant: "destructive"});
        return;
    }
    
    setGeofences(prev => prev.map(g => 
        g.id === selectedGeofenceId 
        ? {...g, shape: clonedActiveOverlay} 
        : g
    ));
    
    toast({
        title: "Geocerca Actualizada",
        description: "Los cambios en la geocerca se han guardado."
    });
    resetActionStates(activeOverlay);
  }

  const handleStartEdit = () => {
    if (!selectedGeofenceId) return;
    const geofenceToEdit = geofences.find(g => g.id === selectedGeofenceId);
    if (!geofenceToEdit) return;
    
    const clonedShape = cloneShape(geofenceToEdit.shape);
    if (!clonedShape) {
        toast({ title: "Error", description: "No se pudo clonar la forma para editar.", variant: "destructive"});
        return;
    }
    
    resetActionStates();

    setIsEditing(true);
    // @ts-ignore
    clonedShape.setOptions({ ...EDIT_COLOR, fillOpacity: 0.3, strokeWeight: 2, editable: true, draggable: true, zIndex: 2 });
    // @ts-ignore
    clonedShape.setMap(map);
    setActiveOverlay(clonedShape);
    updateHistory(getGeometryFromShape(clonedShape));
  }
  
  const handleCancelAction = () => {
    resetActionStates(activeOverlay);
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

      if (isEditing) {
          resetActionStates();
      }

      toast({ title: "Geocerca Eliminada", variant: "destructive" });
  }
  
  const handleToggleDrawing = () => {
    if(isActionActive) {
        handleCancelAction();
    } else {
        setIsDrawingMode(true);
    }
  }

  const handleSetAsDefault = () => {
    if (!selectedGeofenceId) return;
    setDefaultGeofenceId(selectedGeofenceId);
    toast({ title: "Geocerca por Defecto", description: "Se ha establecido la geocerca seleccionada como predeterminada."});
  }
  
  useEffect(() => {
    // Hide all geofences when edit mode is toggled on/off to prevent visual glitches
    geofences.forEach(g => {
        // @ts-ignore
        g.shape.setMap(null);
    })
  }, [isEditingEnabled, geofences]);


  // This is the main effect that controls the visibility of all geofences
  useEffect(() => {
    geofences.forEach(gf => {
        const isDefault = gf.id === defaultGeofenceId;
        const isSelected = gf.id === selectedGeofenceId;

        let visible = false;
        let options: google.maps.PolygonOptions = {};

        if (isEditingEnabled) {
             if (isActionActive) {
                // When drawing or editing, show the original selected geofence as a reference
                if (isSelected && isEditing) {
                    visible = false; // The active overlay is the one being edited, not this one
                } else if (isSelected && isDrawingMode) {
                    visible = true; // Show reference when starting to draw
                    options = {
                        fillColor: REF_COLOR.fillColor,
                        strokeColor: REF_COLOR.strokeColor,
                        fillOpacity: 0.2,
                        strokeWeight: 1,
                        zIndex: 0,
                    };
                }
            } else if (isSelected) { // Selected but not in action
                visible = true;
                options = { 
                    fillColor: isDefault ? DEFAULT_COLOR.fillColor : SAVED_COLOR.fillColor,
                    strokeColor: isDefault ? DEFAULT_COLOR.strokeColor : SAVED_COLOR.strokeColor,
                    fillOpacity: 0.4,
                    strokeWeight: 3,
                    zIndex: 1
                };
            }
        } else {
            // VIEW MODE
            if (viewAll) {
                visible = true;
                options = {
                    fillColor: isDefault ? DEFAULT_COLOR.fillColor : VIEW_ALL_COLOR.fillColor,
                    strokeColor: isDefault ? DEFAULT_COLOR.strokeColor : VIEW_ALL_COLOR.strokeColor,
                    fillOpacity: isDefault ? 0.4 : 0.2,
                    strokeWeight: isDefault ? 3 : 1,
                    zIndex: isDefault ? 2 : 1
                };
            } else if (isDefault) {
                visible = true;
                options = {
                    fillColor: DEFAULT_COLOR.fillColor,
                    strokeColor: DEFAULT_COLOR.strokeColor,
                    fillOpacity: 0.4,
                    strokeWeight: 2,
                    zIndex: 1
                };
            }
        }

        // @ts-ignore
        gf.shape.setOptions({ ...options, editable: false, draggable: false, map: visible ? map : null });
    });
  }, [isEditingEnabled, viewAll, geofences, selectedGeofenceId, defaultGeofenceId, isActionActive, isEditing, isDrawingMode, map]);

  
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
            <div className="w-2/3 border-r">
                <div className="h-full bg-muted overflow-hidden relative shadow-inner">
                   <MapComponent center={center} zoom={15}>
                       {isDrawingMode && (
                           <DrawingManager 
                               onOverlayComplete={handleOverlayComplete} 
                               drawingMode={drawingMode} 
                           />
                       )}
                   </MapComponent>
                </div>
            </div>
            <div className="w-1/3 p-4 space-y-4 overflow-y-auto">
                <div className="p-4 border rounded-lg space-y-4 relative">
                     <h3 className="text-lg font-semibold absolute -top-3 left-3 bg-card px-1">Geocerca</h3>
                     
                     <div className="flex flex-col gap-4 pt-4">
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
                            <label htmlFor="enable-editing" className="text-lg font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Edición
                            </label>
                        </div>

                        <fieldset disabled={!isEditingEnabled} className="space-y-4">
                             <div className="flex items-center gap-2">
                                   <Select value={selectedGeofenceId || ''} onValueChange={id => { if(!isActionActive) setSelectedGeofenceId(id) }} disabled={isActionActive}>
                                        <SelectTrigger className={cn("flex-1", isEditing && "text-[#2980b9] border-[#2980b9] font-bold")}>
                                            <SelectValue placeholder="Seleccionar geocerca para gestionar" />
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

                            {isEditing && (
                                <div className="flex items-center justify-center gap-2 p-2 border rounded-md">
                                    <Button onClick={handleUndo} variant="outline" size="icon" disabled={historyIndex <= 0}>
                                        <Undo className="h-4 w-4"/>
                                        <span className="sr-only">{t('condoDashboard.map.undo')}</span>
                                    </Button>
                                    <Button onClick={handleRedo} variant="outline" size="icon" disabled={historyIndex >= history.length - 1}>
                                        <Redo className="h-4 w-4"/>
                                        <span className="sr-only">{t('condoDashboard.map.redo')}</span>
                                    </Button>
                                </div>
                            )}
                            
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
                            
                             {(isCreating || isEditing) && (
                                <Button onClick={isCreating ? handleSaveNewGeofence : handleSaveChanges} className="w-full">
                                    <Save className="mr-2 h-4 w-4" /> {isCreating ? 'Guardar Geocerca' : 'Guardar Cambios'}
                                </Button>
                            )}
                        </fieldset>
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
