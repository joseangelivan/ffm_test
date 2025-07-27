CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    street TEXT NOT NULL,
    number VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert sample data only if the table is empty
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM condominiums) THEN
      INSERT INTO condominiums (name, street, number, city, state, country)
      VALUES 
          ('Residencial Jardins', 'Rua das Flores', '123', 'São Paulo', 'SP', 'Brasil'),
          ('Condomínio Morada do Sol', 'Avenida Principal', '456', 'Rio de Janeiro', 'RJ', 'Brasil')
      ON CONFLICT (name) DO NOTHING;
   END IF;
END $$;
