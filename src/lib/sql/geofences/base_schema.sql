CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(condominium_id, name)
);

CREATE TRIGGER update_geofences_updated_at
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
