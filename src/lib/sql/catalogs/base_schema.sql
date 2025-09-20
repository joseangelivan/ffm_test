-- Tabla para tipos de dispositivos (ej. Teléfono, Reloj, Coche)
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Tabla para idiomas soportados
CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Tabla para protocolos de comunicación (ej. TCP, UDP, HTTP)
CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON protocols
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

    