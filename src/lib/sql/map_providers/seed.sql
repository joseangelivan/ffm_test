
-- Inserts the default, immutable OpenLayers provider with a fixed UUID.
-- This allows us to identify and protect it from deletion or modification in the application logic.
INSERT INTO map_providers (id, name, provider_type, config_json, is_default, is_immutable)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- Fixed UUID for the default OpenLayers provider
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
    true,
    true
) ON CONFLICT (id) DO NOTHING;
