CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    location VARCHAR(255),
    housing VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
