-- Base schema for the condominiums table
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update the updated_at timestamp on any column change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to ensure no errors on re-running
DROP TRIGGER IF EXISTS on_condominiums_update ON condominiums;

-- Create the trigger
CREATE TRIGGER on_condominiums_update
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Insert a test condominium only if the table is empty to avoid duplicates on re-runs
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM condominiums) THEN
      INSERT INTO condominiums (name, continent, country, state, city, street, number) 
      VALUES ('Residencial Jardins', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Rua das Flores', '123');
   END IF;
END
$$;
