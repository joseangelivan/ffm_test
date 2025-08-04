
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
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ManageThemeListDialog() {
    // This is a placeholder for future functionality
    const mockThemes = [
        { id: 'light', name: 'Claro (por defecto)' },
        { id: 'dark', name: 'Oscuro (por defecto)' },
    ];
    
    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Gestionar Temas</DialogTitle>
                <DialogDescription>
                    Agrega, edita o importa nuevos temas para la aplicación. Esta funcionalidad está en desarrollo.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-lg">Temas Disponibles</h3>
                     <ScrollArea className="h-48 w-full rounded-md border p-2">
                        <div className="space-y-2">
                         {mockThemes.map(theme => (
                             <div key={theme.id} className="flex items-center justify-between rounded-md p-2 bg-muted/50">
                                <span className="text-sm font-medium">{theme.name}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                         ))}
                        </div>
                     </ScrollArea>
                      <Button variant="outline" disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Tema
                    </Button>
                </div>
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-lg">Editor de Tema</h3>
                    <p className="text-sm text-muted-foreground">
                        Aquí se mostrará un editor para los colores y estilos del tema seleccionado.
                    </p>
                    <div className="h-48 w-full rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                        <span className="text-muted-foreground text-sm">Editor de Tema (Próximamente)</span>
                    </div>
                     <Button disabled>Guardar Tema</Button>
                </div>
            </div>
             <DialogFooter className="pt-6">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cerrar</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}
