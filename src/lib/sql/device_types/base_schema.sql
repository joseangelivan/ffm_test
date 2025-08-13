
-- device_types/base_schema.sql

CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ((name_translations->>'en')),
    UNIQUE ((name_translations->>'es')),
    UNIQUE ((name_translations->>'pt-BR'))
);

CREATE OR REPLACE FUNCTION update_device_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_device_types_updated_at
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_device_types_updated_at();

