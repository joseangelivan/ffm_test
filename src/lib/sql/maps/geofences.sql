-- src/lib/sql/maps/geofences.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geofence_shape_enum') THEN
         CREATE TYPE geofence_shape_enum AS ENUM ('polygon', 'circle', 'rectangle');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    shape geofence_shape_enum NOT NULL,
    -- Using JSONB for flexibility to store different geometry types
    -- For a polygon: { "type": "polygon", "paths": [[{lat, lng}, ...]] }
    -- For a circle: { "type": "circle", "center": {lat, lng}, "radius": meters }
    -- For a rectangle: { "type": "rectangle", "bounds": {north, south, east, west} }
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure only one default per condominium
    CONSTRAINT unique_default_geofence_per_condo UNIQUE (condominium_id, is_default) WHERE (is_default = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_geofences_condominium_id ON geofences(condominium_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
