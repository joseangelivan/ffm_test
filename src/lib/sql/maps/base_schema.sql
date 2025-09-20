-- src/lib/sql/maps/base_schema.sql

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_geofences_condominium_id ON geofences(condominium_id);
CREATE INDEX IF NOT EXISTS idx_map_element_types_condominium_id ON map_element_types(condominium_id);

-- Trigger for updated_at
CREATE TRIGGER set_timestamp_geofences
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_map_element_types
BEFORE UPDATE ON map_element_types
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
