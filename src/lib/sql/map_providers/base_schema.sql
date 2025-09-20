
CREATE TABLE IF NOT EXISTS map_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'google', 'leaflet', 'mapbox', 'openlayers'
    config_json JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON map_providers
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
