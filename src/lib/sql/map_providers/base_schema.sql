
CREATE TABLE IF NOT EXISTS map_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL, -- 'google', 'leaflet', 'mapbox', 'openlayers'
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_immutable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_map_providers_updated_at ON map_providers;
CREATE TRIGGER trigger_update_map_providers_updated_at
BEFORE UPDATE ON map_providers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
