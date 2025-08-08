-- Tabla para almacenar polígonos, círculos o rectángulos que definen áreas en el mapa.
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    -- Usamos JSONB para almacenar la geometría, lo que nos da flexibilidad.
    -- Ejemplos: 
    -- { "type": "polygon", "paths": [{"lat": -23, "lng": -46}, ...] }
    -- { "type": "rectangle", "bounds": {"north":-23, "south":-24, "east":-46, "west":-47} }
    -- { "type": "circle", "center": {"lat": -23, "lng": -46}, "radius": 100 }
    geometry JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegura que solo haya una geocerca por defecto por condominio.
CREATE UNIQUE INDEX IF NOT EXISTS one_default_geofence_per_condo_idx ON geofences (condominium_id) WHERE (is_default = true);

-- Tabla para almacenar los tipos de elementos que se pueden colocar en el mapa (cámaras, porterías, etc.)
CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    -- Almacenamos el ícono como un SVG en formato de texto para máxima flexibilidad.
    icon_svg TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

-- Tabla para almacenar las instancias de elementos en el mapa.
CREATE TABLE IF NOT EXISTS map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES map_element_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    -- Usamos JSONB para la geometría del elemento, que usualmente será un punto.
    -- Ejemplo: { "type": "point", "coordinates": {"lat": -23, "lng": -46} }
    geometry JSONB NOT NULL,
    metadata JSONB, -- Para datos adicionales como el ID de una cámara, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento de las consultas de mapas.
CREATE INDEX IF NOT EXISTS idx_geofences_on_condominium_id ON geofences(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_element_types_on_condominium_id ON map_element_types(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_on_condominium_id ON map_elements(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_on_type_id ON map_elements(type_id);
