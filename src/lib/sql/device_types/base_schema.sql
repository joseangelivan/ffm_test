-- Base schema for device types
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add a unique index on the Portuguese name to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_translations_pt_br_key ON device_types ((name_translations->>'pt-BR'));

-- Add trigger to update 'updated_at' timestamp
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
