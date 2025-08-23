-- src/lib/sql/device_types/base_schema.sql

CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a unique index on both name translations to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_translations_idx 
ON device_types ((name_translations->>'es'), (name_translations->>'pt-BR'));

-- Trigger for updated_at
CREATE TRIGGER set_device_types_updated_at
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
