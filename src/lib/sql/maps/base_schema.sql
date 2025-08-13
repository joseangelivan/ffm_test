-- src/lib/sql/maps/base_schema.sql

-- Geofences Table
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.geofences;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.geofences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Map Element Types Table
CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT, -- Can store SVG markup directly
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.map_element_types;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.map_element_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
