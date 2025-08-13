-- Tabla para almacenar los tipos de elementos del mapa (ej. Cámara, Portería)
CREATE TABLE IF NOT EXISTS public.map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon_svg TEXT, -- Almacena el SVG del ícono como texto
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_map_element_types_condominium_id ON public.map_element_types(condominium_id);

-- Trigger para actualizar el campo updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.map_element_types;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.map_element_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
