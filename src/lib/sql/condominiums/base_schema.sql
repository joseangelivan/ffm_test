CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_condominiums ON condominiums;
CREATE TRIGGER set_timestamp_condominiums
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
