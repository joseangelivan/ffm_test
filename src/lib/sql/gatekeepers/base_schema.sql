CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_gatekeepers ON gatekeepers;
CREATE TRIGGER set_timestamp_gatekeepers
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
