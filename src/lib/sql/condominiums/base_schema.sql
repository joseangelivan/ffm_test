-- src/lib/sql/condominiums/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Indexes for condominiums table
CREATE INDEX IF NOT EXISTS idx_condominiums_name ON condominiums(name);

-- Trigger for condominiums table
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
