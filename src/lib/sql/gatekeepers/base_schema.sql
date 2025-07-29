CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location_description TEXT, -- e.g., "Main Gate", "South Entrance"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para la tabla gatekeepers
DROP TRIGGER IF EXISTS set_timestamp_gatekeepers ON gatekeepers;
CREATE TRIGGER set_timestamp_gatekeepers
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
