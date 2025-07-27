CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some sample data for testing
INSERT INTO condominiums (name, address) VALUES 
('Residencial Jardins', 'Rua das Flores, 123, São Paulo, SP'),
('Condomínio Morada do Sol', 'Avenida Principal, 456, Rio de Janeiro, RJ')
ON CONFLICT (id) DO NOTHING;
