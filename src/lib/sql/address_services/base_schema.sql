-- src/lib/sql/address_services/base_schema.sql
CREATE TABLE IF NOT EXISTS address_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar 'updated_at'
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON address_services
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
