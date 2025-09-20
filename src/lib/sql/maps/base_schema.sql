
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_geofences_updated_at ON geofences;
CREATE TRIGGER trigger_update_geofences_updated_at
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_map_element_types_updated_at ON map_element_types;
CREATE TRIGGER trigger_update_map_element_types_updated_at
BEFORE UPDATE ON map_element_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
