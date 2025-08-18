
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_device_type_name_translations UNIQUE ((name_translations->>'es'), (name_translations->>'pt-BR'))
);

CREATE OR REPLACE TRIGGER set_device_types_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
