
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- Using JSONB to store flexible geometry data (Polygon, Circle, etc.)
    -- Example for a polygon: {'type': 'polygon', 'paths': [{'lat': -23, 'lng': -46}, ...]}
    -- Example for a circle: {'type': 'circle', 'center': {'lat': -23, 'lng': -46}, 'radius': 100}
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default geofence per condominium
CREATE UNIQUE INDEX IF NOT EXISTS one_default_geofence_per_condo
ON geofences (condominium_id)
WHERE is_default = TRUE;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_geofences_condominium_id ON geofences(condominium_id);

-- Trigger to automatically update the timestamp
DROP TRIGGER IF EXISTS set_geofences_updated_at ON geofences;
CREATE TRIGGER set_geofences_updated_at
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
