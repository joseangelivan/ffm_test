
CREATE TABLE IF NOT EXISTS devices_communication (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    physical_device_id TEXT NULL,
    protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_devices_comm_timestamp
BEFORE UPDATE ON devices_communication
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
