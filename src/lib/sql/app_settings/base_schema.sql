-- src/lib/sql/app_settings/base_schema.sql

CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar 'updated_at' en cada update
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
