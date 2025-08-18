CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(condominium_id, name)
);

CREATE TRIGGER set_devices_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- This table stores communication-specific details for a device
CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    physical_device_id VARCHAR(255) UNIQUE, -- e.g., MAC address, IMEI. Should be unique across all devices.
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_devices_communication_timestamp
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
