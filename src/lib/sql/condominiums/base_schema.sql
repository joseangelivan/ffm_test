
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a test condominium for verification purposes
INSERT INTO condominiums (name, continent, country, state, city, street, number)
VALUES ('Condomínio Exemplo', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Avenida Paulista', '1000')
ON CONFLICT (name) DO NOTHING;
