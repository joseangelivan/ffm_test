CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_condominium_id ON geofences(condominium_id);

-- Ensure only one default geofence per condominium
CREATE UNIQUE INDEX IF NOT EXISTS one_default_geofence_per_condo
ON geofences (condominium_id)
WHERE is_default = TRUE;


CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_geofences_updated_at'
    ) THEN
        CREATE TRIGGER set_geofences_updated_at
        BEFORE UPDATE ON geofences
        FOR EACH ROW
        EXECUTE PROCEDURE set_updated_at_timestamp();
    END IF;
END
$$;

-- Function to ensure only one geofence is default per condominium
CREATE OR REPLACE FUNCTION ensure_single_default_geofence()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new geofence is being set as default
    IF NEW.is_default = TRUE THEN
        -- Set all other geofences for this condominium to not be default
        UPDATE geofences
        SET is_default = FALSE
        WHERE condominium_id = NEW.condominium_id
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_ensure_single_default_geofence'
    ) THEN
       CREATE TRIGGER trigger_ensure_single_default_geofence
       BEFORE INSERT OR UPDATE ON geofences
       FOR EACH ROW
       EXECUTE PROCEDURE ensure_single_default_geofence();
    END IF;
END
$$;
