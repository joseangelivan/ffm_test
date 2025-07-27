-- Esquema base para la tabla de porteros (gatekeepers)
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar `updated_at` en cada modificación
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_gatekeepers ON gatekeepers;
CREATE TRIGGER trigger_set_updated_at_gatekeepers
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Tabla de configuraciones de idioma/tema para porteros
CREATE TABLE IF NOT EXISTS gatekeeper_settings (
    gatekeeper_id UUID PRIMARY KEY REFERENCES gatekeepers(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'pt',
    theme VARCHAR(10) DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_set_updated_at_gatekeeper_settings ON gatekeeper_settings;
CREATE TRIGGER trigger_set_updated_at_gatekeeper_settings
BEFORE UPDATE ON gatekeeper_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
