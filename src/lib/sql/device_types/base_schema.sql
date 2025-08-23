
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to ensure name translations are unique across both languages
CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_translations_idx ON device_types ((name_translations->>'es'), (name_translations->>'pt-BR'));

-- Trigger for updating the 'updated_at' timestamp
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
