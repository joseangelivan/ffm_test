-- src/lib/sql/devices/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominium_id, name)
);

-- Trigger for devices table
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    physical_device_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for devices_communication table
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
