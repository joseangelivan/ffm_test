-- src/lib/sql/residents/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    housing VARCHAR(255),
    phone VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residents_email ON residents(email);
CREATE INDEX IF NOT EXISTS idx_residents_condominium_id ON residents(condominium_id);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
