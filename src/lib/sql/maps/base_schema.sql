-- Tabla para geocercas
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL, -- Almacena GeoJSON para polígonos, círculos, etc.
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para geofences
DROP TRIGGER IF EXISTS set_updated_at ON public.geofences;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabla para tipos de elementos del mapa (cámaras, porterías, etc.)
CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT, -- Puede ser un SVG o una URL a un ícono
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para map_element_types
DROP TRIGGER IF EXISTS set_updated_at ON public.map_element_types;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON map_element_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
