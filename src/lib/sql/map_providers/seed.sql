-- Seed the default, immutable OpenLayers provider
DO $$
DECLARE
    provider_id UUID := '00000000-0000-0000-0000-000000000001';
    provider_config JSONB;
BEGIN
    -- Define the configuration JSON
    provider_config := '{
      "api_config": {
        "base_url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "parameters": {}
      },
      "ui_config": {
        "attribution": "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
      }
    }';

    -- Insert the immutable provider, or update it if it already exists
    INSERT INTO map_providers (id, name, provider_type, config_json, is_default, is_immutable)
    VALUES (provider_id, 'OpenLayers (Padrão)', 'openlayers', provider_config, TRUE, TRUE)
    ON CONFLICT (id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        provider_type = EXCLUDED.provider_type,
        config_json = EXCLUDED.config_json,
        is_default = TRUE, -- Always ensure it's default on conflict, might be reset by other operations
        is_immutable = TRUE; -- Ensure immutability is set
END $$;
