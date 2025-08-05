-- src/lib/sql/devices/base_schema.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type_enum') THEN
        CREATE TYPE device_type_enum AS ENUM (
            'smartphone', 
            'watch', 
            'car', 
            'esp32', 
            'other'
        );
    END IF;
END$$;


CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL, -- A device can be unassigned
    name VARCHAR(100) NOT NULL,
    type device_type_enum NOT NULL,
    imei VARCHAR(15) UNIQUE, -- International Mobile Equipment Identity, can be null
    serial_number VARCHAR(100) UNIQUE, -- For non-cellular devices
    auth_token TEXT UNIQUE NOT NULL, -- Hashed token for device authentication
    last_location POINT, -- Stores {lat, lng}
    last_seen TIMESTAMPTZ,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_devices_condominium_id ON devices(condominium_id);
CREATE INDEX IF NOT EXISTS idx_devices_resident_id ON devices(resident_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
