-- Seed for map_providers table

-- Insert the default, immutable OpenLayers provider
-- This ensures the application always has a functional map out-of-the-box
INSERT INTO map_providers (id, name, provider_type, config_json, is_default, is_immutable)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'OpenLayers (Padrão)',
    'openlayers',
    '{
        "api_config": {
            "base_url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "parameters": {}
        },
        "ui_config": {
            "attribution": "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
        }
    }',
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    provider_type = EXCLUDED.provider_type,
    config_json = EXCLUDED.config_json,
    is_default = EXCLUDED.is_default,
    is_immutable = EXCLUDED.is_immutable,
    updated_at = NOW();

-- You can add other predefined map providers here if needed
-- For example, a placeholder for Google Maps
INSERT INTO map_providers (name, provider_type, config_json, is_default, is_immutable)
VALUES (
    'Google Maps',
    'google',
    '{
        "api_config": {
            "base_url": "",
            "parameters": {
                "apiKey": "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
            }
        },
        "ui_config": {
            "attribution": "Google"
        }
    }',
    FALSE,
    FALSE
)
ON CONFLICT (name) DO NOTHING;
