
-- residents/base_schema.sql

CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    phone VARCHAR(50),
    location VARCHAR(255), -- Bloco, setor, etc.
    housing VARCHAR(255), -- Apartamento, casa, etc.
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residents_condominium_id ON residents(condominium_id);

CREATE OR REPLACE FUNCTION update_residents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_residents_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE FUNCTION update_residents_updated_at();

