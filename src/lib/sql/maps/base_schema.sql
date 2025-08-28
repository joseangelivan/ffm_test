-- src/lib/sql/maps/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

CREATE INDEX IF NOT EXISTS idx_geofences_condominium_id ON geofences(condominium_id);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON map_element_types
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
