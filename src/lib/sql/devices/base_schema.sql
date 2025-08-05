
CREATE TYPE device_type AS ENUM ('smartphone', 'watch', 'laptop', 'car', 'esp32', 'other');

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL, -- Can be unassigned
    name VARCHAR(100) NOT NULL,
    type device_type NOT NULL,
    token TEXT, -- For device-specific authentication/identification
    last_location POINT,
    last_seen_at TIMESTAMPTZ,
    battery_level INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by condominium
CREATE INDEX IF NOT EXISTS idx_devices_condominium_id ON devices(condominium_id);

-- Optional: Index for resident's devices
CREATE INDEX IF NOT EXISTS idx_devices_resident_id ON devices(resident_id);

-- Function to set updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the timestamp
DROP TRIGGER IF EXISTS set_devices_updated_at ON devices;
CREATE TRIGGER set_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
