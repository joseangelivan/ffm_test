-- Base schema for the 'condominiums' table
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample data only if the table is empty, to avoid duplicates on re-runs.
-- This is a simple way to seed data for development.
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM condominiums) THEN
      INSERT INTO condominiums (name, address) VALUES 
      ('Residencial Jardins', 'Rua das Flores, 123, São Paulo, SP'),
      ('Condomínio Morada do Sol', 'Avenida Principal, 456, Rio de Janeiro, RJ');
   END IF;
END
$$;
