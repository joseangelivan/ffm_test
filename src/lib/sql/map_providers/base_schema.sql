
CREATE TABLE IF NOT EXISTS map_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL, -- e.g., 'google', 'leaflet', 'mapbox'
    config_json JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER set_timestamp_map_providers
BEFORE UPDATE ON map_providers
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM map_providers
        WHERE provider_type = 'google'
    ) THEN
        INSERT INTO map_providers (name, provider_type, config_json, is_default)
        VALUES (
            'Google Maps',
            'google',
            '{
                "apiKey": "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
                "mapId": "FOLLOW_FOR_ME_MAP_ID"
            }',
            TRUE
        );
    END IF;
END
$$;
