
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    location VARCHAR(255),
    housing VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_gatekeepers_updated_at ON gatekeepers;
CREATE TRIGGER trigger_update_gatekeepers_updated_at
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
