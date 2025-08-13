-- Tabela para armazenar cada dispositivo individual
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL,
    device_type_id UUID,
    name VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_condominium
        FOREIGN KEY(condominium_id) 
        REFERENCES condominiums(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_device_type
        FOREIGN KEY(device_type_id) 
        REFERENCES device_types(id)
        ON DELETE SET NULL
);

-- Trigger para auto-atualizar o campo updated_at
CREATE TRIGGER set_devices_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

    