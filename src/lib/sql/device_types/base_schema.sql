
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a unique index on the Portuguese name within the JSONB
CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_translations_pt_br_key ON device_types ((name_translations->>'pt-BR'));
