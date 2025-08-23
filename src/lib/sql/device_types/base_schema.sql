CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE((name_translations->>'es'), (name_translations->>'pt-BR'))
);

DROP TRIGGER IF EXISTS set_timestamp_device_types ON device_types;
CREATE TRIGGER set_timestamp_device_types
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
