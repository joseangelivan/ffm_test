CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_translations_pt_br_key ON device_types ((name_translations->>'pt-BR'));

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
