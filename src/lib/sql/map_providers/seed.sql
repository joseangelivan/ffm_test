DO $$
DECLARE
    osm_provider_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    INSERT INTO map_providers (id, name, provider_type, config_json, is_default, is_immutable)
    VALUES (
        osm_provider_id,
        'OpenLayers (Padrão)',
        'openlayers',
        '{
            "api_config": {
                "provider": "openlayers",
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
    ON CONFLICT (id) 
    DO UPDATE SET
        name = EXCLUDED.name,
        provider_type = EXCLUDED.provider_type,
        config_json = EXCLUDED.config_json,
        is_default = EXCLUDED.is_default,
        is_immutable = EXCLUDED.is_immutable,
        updated_at = NOW();
END $$;
