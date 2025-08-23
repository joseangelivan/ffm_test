CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(condominium_id, name)
);

CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    physical_device_id VARCHAR(255),
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    last_communication TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_devices ON devices;
CREATE TRIGGER set_timestamp_devices
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_devices_communication ON devices_communication;
CREATE TRIGGER set_timestamp_devices_communication
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
