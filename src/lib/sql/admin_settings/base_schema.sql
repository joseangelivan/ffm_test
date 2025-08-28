-- src/lib/sql/admin_settings/base_schema.sql

CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    theme VARCHAR(255) NOT NULL DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar 'updated_at' en cada update
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
