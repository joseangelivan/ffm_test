-- src/lib/sql/maps/base_schema.sql

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon_svg TEXT, -- Store SVG content directly
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(condominium_id, name)
);

CREATE TABLE IF NOT EXISTS map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES map_element_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL, -- Could be a point for a camera, a polygon for an area
    related_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geofences_on_condominium_id ON geofences(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_element_types_on_condominium_id ON map_element_types(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_on_condominium_id ON map_elements(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_on_type_id ON map_elements(type_id);
