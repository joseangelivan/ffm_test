
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    condominio_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gatekeeper_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gatekeeper_id UUID NOT NULL REFERENCES gatekeepers(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TRIGGER update_gatekeepers_updated_at
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gatekeeper_settings_updated_at
BEFORE UPDATE ON gatekeeper_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
