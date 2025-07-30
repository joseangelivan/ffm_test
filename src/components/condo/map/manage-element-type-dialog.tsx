
"use client";

import React, { useState } from 'react';
import {
  PlusCircle,
  Edit,
  Trash2,
  Video,
  Building2,
  Home,
  Square,
  Layers,
  Sparkles,
  Search,
  Upload,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const AddElementTypeDialog = ({
    isOpen,
    onOpenChange,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
     return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                        <DialogTitle>Agregar Nuevo Tipo de Elemento</DialogTitle>
                        <DialogDescription>
                        Define un nuevo tipo de elemento para usar en el mapa.
                        </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div>
                        <Label htmlFor="element-name">Nombre del Tipo</Label>
                        <Input id="element-name" placeholder="Ej: Zona de Juegos" />
                    </div>
                    <div>
                        <Label>Ícono del Elemento</Label>
                        <Tabs defaultValue="collection">
                            <TabsList className="grid w-full grid-cols-5 h-auto">
                                <TabsTrigger value="collection" className="flex-col gap-1 h-14"><Layers className="h-4 w-4"/>Colección</TabsTrigger>
                                <TabsTrigger value="ai" className="flex-col gap-1 h-14"><Sparkles className="h-4 w-4"/>IA</TabsTrigger>
                                <TabsTrigger value="search" className="flex-col gap-1 h-14"><Search className="h-4 w-4"/>Buscar</TabsTrigger>
                                <TabsTrigger value="pc" className="flex-col gap-1 h-14"><Upload className="h-4 w-4"/>PC</TabsTrigger>
                                <TabsTrigger value="link" className="flex-col gap-1 h-14"><Link2 className="h-4 w-4"/>Link</TabsTrigger>
                            </TabsList>
                            <TabsContent value="collection" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>Colección de Íconos</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">Próximamente: Busca en una colección de íconos predefinidos.</p>
                                    </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="ai" className="mt-4">
                                <Card>
                                    <CardHeader><CardTitle>Generar Ícono con IA</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">Describe el ícono que necesitas. La IA generará una imagen minimalista en blanco y negro.</p>
                                        <Textarea placeholder="Ej: un columpio simple, una cancha de baloncesto..."/>
                                        <div className="flex justify-center items-center h-24 bg-muted rounded-md">
                                            <span className="text-muted-foreground">Vista Previa</span>
                                        </div>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="search" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>Buscar Ícono en Internet</CardTitle></CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Próximamente: Busca y selecciona íconos de la web.</p>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="pc" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>Subir desde PC</CardTitle></CardHeader>
                                        <CardContent>
                                        <p className="text-sm text-muted-foreground">Próximamente: Sube un archivo de ícono (SVG, PNG) desde tu computadora.</p>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                            <TabsContent value="link" className="mt-4">
                                    <Card>
                                    <CardHeader><CardTitle>Importar desde un Link</CardTitle></CardHeader>
                                        <CardContent>
                                        <p className="text-sm text-muted-foreground">Próximamente: Pega un enlace directo a una imagen de ícono.</p>
                                        </CardContent>
                                    </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
                    <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button>Guardar Tipo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
     )
}

export function ManageElementTypeDialog() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    
    const mockElementTypes = [
        {id: 'cam', name: 'Cámara de Vigilancia', icon: <Video className="h-4 w-4" />},
        {id: 'gate', name: 'Portería / Garita', icon: <Building2 className="h-4 w-4" />},
        {id: 'house', name: 'Área de Vivienda', icon: <Home className="h-4 w-4" />},
        {id: 'other', name: 'Otro', icon: <Square className="h-4 w-4" />}
    ]

    return (
        <>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Gestionar Tipos de Elemento</DialogTitle>
                    <DialogDescription>
                        Agrega, edita o elimina los tipos de elementos que se pueden colocar en el mapa.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                         {mockElementTypes.map(type => (
                            <div key={type.id} className="flex items-center justify-between p-2 border rounded-md">
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">{type.icon}</span>
                                    <span>{type.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                     <DialogClose asChild>
                        <Button variant="outline">Cerrar</Button>
                    </DialogClose>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Nuevo Tipo
                    </Button>
                </DialogFooter>
            </DialogContent>

            <AddElementTypeDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
        </>
    );
};
