-- src/lib/sql/device_types/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update 'updated_at' on each update
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
