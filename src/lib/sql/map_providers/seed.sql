
-- This is the default, immutable map provider that the application will fall back to.
-- It uses OpenStreetMap, which doesn't require an API key.
-- The ID is fixed to ensure it can always be referenced in the code if needed.
INSERT INTO map_providers (id, name, provider_type, config_json, is_default, is_immutable) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'OpenLayers (Padrão)',
    'openlayers',
    '{
        "ui_config": {
            "attribution": "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
        },
        "api_config": {
            "provider": "openlayers",
            "base_url": "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "parameters": {}
        }
    }',
    TRUE,
    TRUE
) ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
provider_type = EXCLUDED.provider_type,
config_json = EXCLUDED.config_json,
is_default = EXCLUDED.is_default,
is_immutable = EXCLUDED.is_immutable,
updated_at = NOW();
