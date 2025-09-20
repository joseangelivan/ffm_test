
-- Tabla para configuraciones generales de la aplicación
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar el campo updated_at en la tabla app_settings
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
