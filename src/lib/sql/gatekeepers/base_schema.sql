
-- gatekeepers/base_schema.sql

CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    phone VARCHAR(50),
    location VARCHAR(255), -- Guarita, portaria, etc.
    housing VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);

CREATE OR REPLACE FUNCTION update_gatekeepers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_gatekeepers_updated_at
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION update_gatekeepers_updated_at();

