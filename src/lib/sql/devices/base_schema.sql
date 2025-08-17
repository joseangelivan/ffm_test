
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL,
    device_type_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_condominium
        FOREIGN KEY(condominium_id) 
        REFERENCES condominiums(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_device_type
        FOREIGN KEY(device_type_id) 
        REFERENCES device_types(id)
        ON DELETE RESTRICT,
    UNIQUE(condominium_id, name)
);

CREATE TRIGGER set_devices_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
