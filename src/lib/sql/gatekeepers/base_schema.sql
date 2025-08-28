-- src/lib/sql/gatekeepers/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS gatekeepers (
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

CREATE INDEX IF NOT EXISTS idx_gatekeepers_email ON gatekeepers(email);
CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
