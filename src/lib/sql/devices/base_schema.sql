CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID REFERENCES device_types(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    physical_device_id VARCHAR(255),
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_devices_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_devices_communication_timestamp
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

