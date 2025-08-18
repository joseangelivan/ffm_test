-- src/lib/sql/devices/base_schema.sql

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL,
    device_type_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (device_type_id) REFERENCES device_types(id) ON DELETE RESTRICT,
    UNIQUE (condominium_id, name)
);

CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY,
    physical_device_id VARCHAR(255) UNIQUE,
    protocol_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE SET NULL
);


-- Trigger para actualizar el campo updated_at en la tabla devices
DROP TRIGGER IF EXISTS set_devices_timestamp ON devices;
CREATE TRIGGER set_devices_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger para actualizar el campo updated_at en la tabla devices_communication
DROP TRIGGER IF EXISTS set_devices_communication_timestamp ON devices_communication;
CREATE TRIGGER set_devices_communication_timestamp
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
