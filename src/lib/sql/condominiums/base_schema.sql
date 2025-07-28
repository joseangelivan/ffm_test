CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed a test condominium if it doesn't exist
INSERT INTO condominiums (name, continent, country, state, city, street, number)
VALUES ('Residencial Jardins', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Av. Paulista', '1000')
ON CONFLICT (name) DO NOTHING;
