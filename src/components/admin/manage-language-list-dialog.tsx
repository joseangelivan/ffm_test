
"use client";

import React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';

export function ManageLanguageListDialog() {
    // This is a placeholder for future functionality
    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Gestionar Idiomas</DialogTitle>
                <DialogDescription>
                    Agrega o importa nuevos idiomas para la aplicación. Esta funcionalidad está en desarrollo.
                </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="add">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="add">Agregar Idioma</TabsTrigger>
                    <TabsTrigger value="import">Importar Plantilla</TabsTrigger>
                </TabsList>
                <TabsContent value="add" className="pt-4">
                     <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Define un nuevo idioma y su clave (ej. "en" para Inglés).</p>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="lang-name">Nombre del Idioma</Label>
                                <Input id="lang-name" placeholder="English" disabled />
                            </div>
                            <div>
                                <Label htmlFor="lang-key">Clave del Idioma</Label>
                                <Input id="lang-key" placeholder="en" disabled/>
                            </div>
                        </div>
                     </div>
                </TabsContent>
                 <TabsContent value="import" className="pt-4">
                     <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Sube un archivo JSON con las traducciones.</p>
                        <div>
                            <Label htmlFor="import-file">Archivo de Plantilla (.json)</Label>
                            <Input id="import-file" type="file" disabled/>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cerrar</Button>
                </DialogClose>
                <Button type="button" disabled>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Guardar Idioma
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
