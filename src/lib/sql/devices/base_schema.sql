CREATE TYPE "device_type" AS ENUM ('smartphone', 'watch', 'car', 'esp32', 'other');

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type device_type NOT NULL DEFAULT 'other',
    token TEXT NOT NULL UNIQUE,
    last_location GEOGRAPHY(Point, 4326),
    battery_level INTEGER,
    status VARCHAR(50) DEFAULT 'offline',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_condominium_id ON devices(condominium_id);
CREATE INDEX IF NOT EXISTS idx_devices_resident_id ON devices(resident_id);

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
        WHERE tgname = 'set_devices_updated_at'
    ) THEN
        CREATE TRIGGER set_devices_updated_at
        BEFORE UPDATE ON devices
        FOR EACH ROW
        EXECUTE PROCEDURE set_updated_at_timestamp();
    END IF;
END
$$;
