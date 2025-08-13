CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_condominiums_updated_at
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Insertar condominio de ejemplo
INSERT INTO condominiums (name, continent, country, state, city, street, number) 
VALUES ('Condomínio Exemplo', 'Americas', 'Brazil', 'São Paulo', 'São Paulo', 'Avenida Paulista', '1000') 
ON CONFLICT (name) DO NOTHING;
