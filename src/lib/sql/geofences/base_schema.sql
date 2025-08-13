CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
