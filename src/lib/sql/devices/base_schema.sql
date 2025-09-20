
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(condominium_id, name)
);

CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    physical_device_id VARCHAR(255),
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_devices_updated_at ON devices;
CREATE TRIGGER trigger_update_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_devices_communication_updated_at ON devices_communication;
CREATE TRIGGER trigger_update_devices_communication_updated_at
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
