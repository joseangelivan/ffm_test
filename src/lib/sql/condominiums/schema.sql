-- Condominiums Table
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

-- Trigger for condominiums table
DROP TRIGGER IF EXISTS update_condominiums_updated_at ON condominiums;
CREATE TRIGGER update_condominiums_updated_at
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
