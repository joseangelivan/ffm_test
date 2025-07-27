-- Base schema for the condominiums table
-- This file will be executed automatically by the migration logic.

-- Drop the table if it exists to ensure a clean start
DROP TABLE IF EXISTS condominiums CASCADE;
DROP TABLE IF EXISTS condominium_settings CASCADE;


-- Main table for condominiums
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Settings table for condominiums
CREATE TABLE IF NOT EXISTS condominium_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(condominium_id)
);


-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_condominiums_name ON condominiums(name);
CREATE INDEX IF NOT EXISTS idx_condominium_settings_condominium_id ON condominium_settings(condominium_id);


-- Test data insertion
-- This will only be inserted if the condominium doesn't already exist.
INSERT INTO condominiums (name, continent, country, state, city, street, number)
VALUES ('Condominio de Prueba', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Avenida Paulista', '1000')
ON CONFLICT (name) DO NOTHING;
