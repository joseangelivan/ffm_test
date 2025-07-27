-- Base schema for the 'condominio' management

-- Table to store information about each condominium
CREATE TABLE IF NOT EXISTS condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON condominios
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Seed with some test data for new databases
INSERT INTO condominios (name, address) VALUES
('Residencial Jardins', 'Rua das Flores, 123, São Paulo, SP'),
('Condomínio Morada do Sol', 'Avenida Principal, 456, Rio de Janeiro, RJ')
ON CONFLICT (name) DO NOTHING;
