CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample data only if the table is empty, to avoid duplication on re-runs
INSERT INTO condominiums (name, address)
SELECT 'Residencial Jardins', 'Rua das Flores, 123, São Paulo, SP'
WHERE NOT EXISTS (SELECT 1 FROM condominiums WHERE name = 'Residencial Jardins');

INSERT INTO condominiums (name, address)
SELECT 'Condomínio Morada do Sol', 'Avenida Principal, 456, Rio de Janeiro, RJ'
WHERE NOT EXISTS (SELECT 1 FROM condominiums WHERE name = 'Condomínio Morada do Sol');
