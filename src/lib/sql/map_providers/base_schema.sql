-- src/lib/sql/map_providers/base_schema.sql
CREATE TABLE IF NOT EXISTS map_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'google', 'leaflet', 'mapbox', 'openlayers', etc.
    config_json JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    is_immutable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar 'updated_at'
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON map_providers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
