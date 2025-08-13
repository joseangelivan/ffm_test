
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on the english name to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_en_idx ON device_types ((name_translations->>'en'));

CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
