
-- Tabla para almacenar los tipos de elementos que se pueden colocar en el mapa
CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para almacenar las geocercas de cada condominio
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(condominium_id, name)
);

-- Tabla para almacenar los elementos individuales del mapa
CREATE TABLE IF NOT EXISTS map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL,
    type_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    geometry jsonb,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES map_element_types(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_geofences_condominium_id ON geofences(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_condominium_id ON map_elements(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_type_id ON map_elements(type_id);
