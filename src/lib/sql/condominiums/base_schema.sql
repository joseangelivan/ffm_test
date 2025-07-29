CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para la tabla condominiums
DROP TRIGGER IF EXISTS set_timestamp_condominiums ON condominiums;
CREATE TRIGGER set_timestamp_condominiums
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
