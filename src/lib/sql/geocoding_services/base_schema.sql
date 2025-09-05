
-- src/lib/sql/geocoding_services/base_schema.sql

CREATE TABLE IF NOT EXISTS geocoding_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically update updated_at on row modification
DROP TRIGGER IF EXISTS set_timestamp ON geocoding_services;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON geocoding_services
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
