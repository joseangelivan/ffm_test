-- Crear la extensión si no existe, necesaria para uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Definición de la tabla de condominios
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_condominiums_updated_at ON condominiums;
CREATE TRIGGER set_condominiums_updated_at
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Insertar un dato de prueba para asegurar que la tabla no esté vacía y facilitar las pruebas
-- Esto solo se insertará si la tabla está vacía para evitar duplicados en ejecuciones posteriores
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM condominiums WHERE name = 'Residencial Jardins (Ejemplo)') THEN
        INSERT INTO condominiums (name, continent, country, state, city, street, number)
        VALUES ('Residencial Jardins (Ejemplo)', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Av. Paulista', '1000');
    END IF;
END
$$;
